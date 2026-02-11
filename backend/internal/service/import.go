package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/naotama2002/habity/backend/internal/habitify"
)

// ImportService orchestrates the Habitify → Habity import process.
type ImportService struct {
	pool *pgxpool.Pool
}

// ImportResult holds the result of an import operation.
type ImportResult struct {
	HabitsImported int      `json:"habits_imported"`
	LogsImported   int      `json:"logs_imported"`
	Errors         []string `json:"errors,omitempty"`
}

// NewImportService creates a new ImportService.
func NewImportService(pool *pgxpool.Pool) *ImportService {
	return &ImportService{pool: pool}
}

// Run executes the import process.
func (s *ImportService) Run(ctx context.Context, userID, apiKey string, importHabits, importLogs bool, timezone string) (*ImportResult, error) {
	// Load user timezone (default to UTC if not provided or invalid)
	loc := time.UTC
	if timezone != "" {
		if parsed, err := time.LoadLocation(timezone); err == nil {
			loc = parsed
		} else {
			log.Printf("Invalid timezone %q, falling back to UTC: %v", timezone, err)
		}
	}

	client := habitify.NewClient(apiKey)

	// 1. Fetch habits (also validates API key)
	habits, err := client.GetHabits(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch habits from Habitify: %w", err)
	}

	result := &ImportResult{}

	if !importHabits && !importLogs {
		return result, nil
	}

	// 2. Extract areas → create categories
	categoryMap, err := s.ensureCategories(ctx, userID, habits)
	if err != nil {
		return nil, fmt.Errorf("failed to create categories: %w", err)
	}

	// 3. Import habits
	habitIDMap := make(map[string]string) // habitify ID → habity ID
	if importHabits {
		for _, h := range habits {
			habityHabit := TransformHabit(h, userID, categoryMap)
			habityID, err := s.upsertHabit(ctx, habityHabit)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("habit %q: %v", h.Name, err))
				log.Printf("Error importing habit %s: %v", h.ID, err)
				continue
			}
			habitIDMap[h.ID] = habityID
			result.HabitsImported++
		}
	} else {
		// If not importing habits, still need to build the ID map for logs
		for _, h := range habits {
			habityID, err := s.findHabitByExternalID(ctx, userID, h.ID)
			if err != nil || habityID == "" {
				continue
			}
			habitIDMap[h.ID] = habityID
		}
	}

	// 4. Import logs
	if importLogs {
		for _, h := range habits {
			habityHabitID, ok := habitIDMap[h.ID]
			if !ok {
				continue
			}

			from := h.StartDate
			if from.IsZero() {
				from = time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
			}
			to := time.Now().UTC()

			log.Printf("Fetching logs for habit %s (%s) from=%s to=%s", h.ID, h.Name, from.Format(time.RFC3339), to.Format(time.RFC3339))
			logs, err := client.GetLogs(ctx, h.ID, from, to)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("logs for %q: %v", h.Name, err))
				log.Printf("Error fetching logs for habit %s: %v", h.ID, err)
				continue
			}

			for _, l := range logs {
				habityLog := TransformLog(l, habityHabitID, userID, loc)
				if err := s.upsertLog(ctx, habityLog); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("log %s: %v", l.ID, err))
					continue
				}
				result.LogsImported++
			}
		}
	}

	return result, nil
}

// ensureCategories creates categories from Habitify areas and returns a map of area ID → category ID.
func (s *ImportService) ensureCategories(ctx context.Context, userID string, habits []habitify.Habit) (map[string]string, error) {
	categoryMap := make(map[string]string)
	seen := make(map[string]bool)

	for _, h := range habits {
		if h.Area == nil || seen[h.Area.ID] {
			continue
		}
		seen[h.Area.ID] = true

		var categoryID string
		err := s.pool.QueryRow(ctx,
			`INSERT INTO categories (user_id, name, color, sort_order)
			 VALUES ($1, $2, '#6366f1', 0)
			 ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
			 RETURNING id`,
			userID, h.Area.Name,
		).Scan(&categoryID)
		if err != nil {
			return nil, fmt.Errorf("insert category %q: %w", h.Area.Name, err)
		}
		categoryMap[h.Area.ID] = categoryID
	}

	return categoryMap, nil
}

// upsertHabit inserts a habit or skips if one with the same external_id already exists.
func (s *ImportService) upsertHabit(ctx context.Context, h HabityHabit) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO habits (
			user_id, name, description, category_id, tracking_type,
			goal_value, goal_unit, goal_period, recurrence_rule,
			time_of_day, reminder_enabled, start_date, status,
			sort_order, external_id, external_source
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, $15, $16
		)
		ON CONFLICT (user_id, external_id) WHERE external_id IS NOT NULL
		DO UPDATE SET name = EXCLUDED.name
		RETURNING id`,
		h.UserID, h.Name, h.Description, h.CategoryID, h.TrackingType,
		h.GoalValue, h.GoalUnit, h.GoalPeriod, h.RecurrenceRule,
		h.TimeOfDay, h.ReminderEnabled, h.StartDate, h.Status,
		h.SortOrder, h.ExternalID, h.ExternalSource,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// upsertLog inserts a log or skips if one with the same habit_id + target_date already exists.
func (s *ImportService) upsertLog(ctx context.Context, l HabityLog) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO habit_logs (user_id, habit_id, value, target_date, completed_at, status, external_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (habit_id, target_date) DO NOTHING`,
		l.UserID, l.HabitID, l.Value, l.TargetDate, l.CompletedAt, l.Status, l.ExternalID,
	)
	return err
}

// findHabitByExternalID finds a Habity habit by its Habitify external_id.
func (s *ImportService) findHabitByExternalID(ctx context.Context, userID, externalID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM habits WHERE user_id = $1 AND external_id = $2 AND external_source = 'habitify'`,
		userID, externalID,
	).Scan(&id)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return id, err
}
