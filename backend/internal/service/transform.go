package service

import (
	"math"
	"time"

	"github.com/naotama2002/habity/backend/internal/habitify"
)

// HabityHabit represents a habit to be inserted into Habity's database.
type HabityHabit struct {
	UserID          string
	Name            string
	Description     *string
	CategoryID      *string
	TrackingType    string
	GoalValue       float64
	GoalUnit        string
	GoalPeriod      string
	RecurrenceRule  *string
	TimeOfDay       []string
	ReminderEnabled bool
	StartDate       string
	Status          string
	SortOrder       int
	ExternalID      string
	ExternalSource  string
}

// HabityLog represents a habit log to be inserted into Habity's database.
type HabityLog struct {
	UserID      string
	HabitID     string
	Value       float64
	TargetDate  string
	CompletedAt time.Time
	Status      string
	ExternalID  string
}

// TransformHabit converts a Habitify habit to a Habity habit.
func TransformHabit(h habitify.Habit, userID string, categoryMap map[string]string) HabityHabit {
	trackingType := mapLogMethod(h.LogMethod)
	goalValue, goalUnit, goalPeriod := mapGoal(h.Goal, trackingType)
	status := mapStatus(h.IsArchived)
	timeOfDay := mapTimeOfDay(h.TimeOfDay)
	startDate := h.StartDate.Format("2006-01-02")

	var recurrence *string
	if h.Recurrence != "" {
		recurrence = &h.Recurrence
	}

	var categoryID *string
	if h.Area != nil {
		if id, ok := categoryMap[h.Area.ID]; ok {
			categoryID = &id
		}
	}

	return HabityHabit{
		UserID:          userID,
		Name:            h.Name,
		CategoryID:      categoryID,
		TrackingType:    trackingType,
		GoalValue:       goalValue,
		GoalUnit:        goalUnit,
		GoalPeriod:      goalPeriod,
		RecurrenceRule:  recurrence,
		TimeOfDay:       timeOfDay,
		ReminderEnabled: false,
		StartDate:       startDate,
		Status:          status,
		SortOrder:       safePriorityToInt(h.Priority),
		ExternalID:      h.ID,
		ExternalSource:  "habitify",
	}
}

// TransformLog converts a Habitify log to a Habity log.
// loc is the user's timezone used to determine the correct target_date.
func TransformLog(l habitify.Log, habityHabitID, userID string, loc *time.Location) HabityLog {
	targetDate := l.CreatedDate.In(loc).Format("2006-01-02")

	return HabityLog{
		UserID:      userID,
		HabitID:     habityHabitID,
		Value:       l.Value,
		TargetDate:  targetDate,
		CompletedAt: l.CreatedDate,
		Status:      "completed",
		ExternalID:  l.ID,
	}
}

func safePriorityToInt(p float64) int {
	if math.IsNaN(p) || math.IsInf(p, 0) || p > math.MaxInt32 || p < math.MinInt32 {
		return 0
	}
	return int(p)
}

func mapLogMethod(logMethod string) string {
	switch logMethod {
	case "check":
		return "boolean"
	case "measure", "number":
		return "numeric"
	case "timer":
		return "duration"
	default:
		return "boolean"
	}
}

func mapGoal(goal *habitify.Goal, trackingType string) (float64, string, string) {
	if goal == nil {
		return 1, "times", "daily"
	}

	unit := mapGoalUnit(goal.UnitType)
	period := mapGoalPeriod(goal.Periodicity)

	return goal.Value, unit, period
}

func mapGoalUnit(unitType string) string {
	switch unitType {
	case "count":
		return "times"
	case "minute":
		return "min"
	case "hour":
		return "hours"
	case "meter":
		return "m"
	case "kilometer":
		return "km"
	default:
		return unitType
	}
}

func mapGoalPeriod(periodicity string) string {
	switch periodicity {
	case "daily", "weekly", "monthly":
		return periodicity
	default:
		return "daily"
	}
}

func mapStatus(isArchived bool) string {
	if isArchived {
		return "archived"
	}
	return "active"
}

func mapTimeOfDay(times []string) []string {
	if len(times) == 0 {
		return []string{"anytime"}
	}

	valid := map[string]bool{
		"anytime":   true,
		"morning":   true,
		"afternoon": true,
		"evening":   true,
		"night":     true,
	}

	var result []string
	for _, t := range times {
		if valid[t] {
			result = append(result, t)
		}
	}

	if len(result) == 0 {
		return []string{"anytime"}
	}
	return result
}
