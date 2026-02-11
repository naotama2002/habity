package service

import (
	"math"
	"testing"
	"time"

	"github.com/naotama2002/habity/backend/internal/habitify"
)

func TestTransformHabit_BasicCheck(t *testing.T) {
	h := habitify.Habit{
		ID:         "h-1",
		Name:       "Morning Run",
		IsArchived: false,
		StartDate:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		TimeOfDay:  []string{"morning"},
		LogMethod:  "check",
		Priority:   2,
		Recurrence: "RRULE:FREQ=DAILY",
		Goal:       &habitify.Goal{UnitType: "count", Value: 1, Periodicity: "daily"},
		Area:       &habitify.Area{ID: "area-1", Name: "Health"},
	}

	categoryMap := map[string]string{"area-1": "cat-uuid-1"}
	result := TransformHabit(h, "user-1", categoryMap)

	if result.UserID != "user-1" {
		t.Errorf("expected user-1, got %s", result.UserID)
	}
	if result.Name != "Morning Run" {
		t.Errorf("expected Morning Run, got %s", result.Name)
	}
	if result.TrackingType != "boolean" {
		t.Errorf("expected boolean, got %s", result.TrackingType)
	}
	if result.GoalValue != 1 {
		t.Errorf("expected goal value 1, got %f", result.GoalValue)
	}
	if result.GoalUnit != "times" {
		t.Errorf("expected times, got %s", result.GoalUnit)
	}
	if result.GoalPeriod != "daily" {
		t.Errorf("expected daily, got %s", result.GoalPeriod)
	}
	if result.Status != "active" {
		t.Errorf("expected active, got %s", result.Status)
	}
	if result.StartDate != "2024-01-01" {
		t.Errorf("expected 2024-01-01, got %s", result.StartDate)
	}
	if result.ExternalID != "h-1" {
		t.Errorf("expected h-1, got %s", result.ExternalID)
	}
	if result.ExternalSource != "habitify" {
		t.Errorf("expected habitify, got %s", result.ExternalSource)
	}
	if result.CategoryID == nil || *result.CategoryID != "cat-uuid-1" {
		t.Error("expected category_id to be cat-uuid-1")
	}
	if result.RecurrenceRule == nil || *result.RecurrenceRule != "RRULE:FREQ=DAILY" {
		t.Error("expected recurrence rule")
	}
	if len(result.TimeOfDay) != 1 || result.TimeOfDay[0] != "morning" {
		t.Errorf("expected [morning], got %v", result.TimeOfDay)
	}
	if result.SortOrder != 2 {
		t.Errorf("expected sort_order 2, got %d", result.SortOrder)
	}
}

func TestTransformHabit_Archived(t *testing.T) {
	h := habitify.Habit{
		ID:         "h-2",
		Name:       "Old Habit",
		IsArchived: true,
		StartDate:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		LogMethod:  "check",
	}

	result := TransformHabit(h, "user-1", nil)
	if result.Status != "archived" {
		t.Errorf("expected archived, got %s", result.Status)
	}
}

func TestTransformHabit_LogMethodMapping(t *testing.T) {
	tests := []struct {
		logMethod    string
		expectedType string
	}{
		{"check", "boolean"},
		{"measure", "numeric"},
		{"number", "numeric"},
		{"timer", "duration"},
		{"unknown", "boolean"},
	}

	for _, tt := range tests {
		t.Run(tt.logMethod, func(t *testing.T) {
			h := habitify.Habit{
				ID:        "h-1",
				Name:      "Test",
				StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				LogMethod: tt.logMethod,
			}
			result := TransformHabit(h, "user-1", nil)
			if result.TrackingType != tt.expectedType {
				t.Errorf("log_method %s: expected %s, got %s", tt.logMethod, tt.expectedType, result.TrackingType)
			}
		})
	}
}

func TestTransformHabit_GoalMapping(t *testing.T) {
	tests := []struct {
		name       string
		goal       *habitify.Goal
		wantValue  float64
		wantUnit   string
		wantPeriod string
	}{
		{
			name:       "nil goal defaults",
			goal:       nil,
			wantValue:  1,
			wantUnit:   "times",
			wantPeriod: "daily",
		},
		{
			name:       "count daily",
			goal:       &habitify.Goal{UnitType: "count", Value: 5, Periodicity: "daily"},
			wantValue:  5,
			wantUnit:   "times",
			wantPeriod: "daily",
		},
		{
			name:       "minute weekly",
			goal:       &habitify.Goal{UnitType: "minute", Value: 30, Periodicity: "weekly"},
			wantValue:  30,
			wantUnit:   "min",
			wantPeriod: "weekly",
		},
		{
			name:       "kilometer monthly",
			goal:       &habitify.Goal{UnitType: "kilometer", Value: 100, Periodicity: "monthly"},
			wantValue:  100,
			wantUnit:   "km",
			wantPeriod: "monthly",
		},
		{
			name:       "unknown unit type passes through",
			goal:       &habitify.Goal{UnitType: "custom_unit", Value: 10, Periodicity: "daily"},
			wantValue:  10,
			wantUnit:   "custom_unit",
			wantPeriod: "daily",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := habitify.Habit{
				ID:        "h-1",
				Name:      "Test",
				StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				LogMethod: "check",
				Goal:      tt.goal,
			}
			result := TransformHabit(h, "user-1", nil)
			if result.GoalValue != tt.wantValue {
				t.Errorf("expected value %f, got %f", tt.wantValue, result.GoalValue)
			}
			if result.GoalUnit != tt.wantUnit {
				t.Errorf("expected unit %s, got %s", tt.wantUnit, result.GoalUnit)
			}
			if result.GoalPeriod != tt.wantPeriod {
				t.Errorf("expected period %s, got %s", tt.wantPeriod, result.GoalPeriod)
			}
		})
	}
}

func TestTransformHabit_NullArea(t *testing.T) {
	h := habitify.Habit{
		ID:        "h-1",
		Name:      "Test",
		StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		LogMethod: "check",
		Area:      nil,
	}

	result := TransformHabit(h, "user-1", nil)
	if result.CategoryID != nil {
		t.Error("expected nil category_id for nil area")
	}
}

func TestTransformHabit_EmptyTimeOfDay(t *testing.T) {
	h := habitify.Habit{
		ID:        "h-1",
		Name:      "Test",
		StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		LogMethod: "check",
		TimeOfDay: []string{},
	}

	result := TransformHabit(h, "user-1", nil)
	if len(result.TimeOfDay) != 1 || result.TimeOfDay[0] != "anytime" {
		t.Errorf("expected [anytime] for empty time_of_day, got %v", result.TimeOfDay)
	}
}

func TestTransformHabit_InvalidTimeOfDayFiltered(t *testing.T) {
	h := habitify.Habit{
		ID:        "h-1",
		Name:      "Test",
		StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		LogMethod: "check",
		TimeOfDay: []string{"morning", "invalid_value", "evening"},
	}

	result := TransformHabit(h, "user-1", nil)
	if len(result.TimeOfDay) != 2 {
		t.Fatalf("expected 2 items, got %v", result.TimeOfDay)
	}
	if result.TimeOfDay[0] != "morning" || result.TimeOfDay[1] != "evening" {
		t.Errorf("expected [morning, evening], got %v", result.TimeOfDay)
	}
}

func TestTransformHabit_NoRecurrence(t *testing.T) {
	h := habitify.Habit{
		ID:        "h-1",
		Name:      "Test",
		StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		LogMethod: "check",
	}

	result := TransformHabit(h, "user-1", nil)
	if result.RecurrenceRule != nil {
		t.Error("expected nil recurrence rule for empty string")
	}
}

func TestTransformHabit_OverflowPriority(t *testing.T) {
	tests := []struct {
		name     string
		priority float64
		want     int
	}{
		{"normal", 5, 5},
		{"zero", 0, 0},
		{"negative normal", -1, -1},
		{"very large", 1e18, 0},
		{"very small", -1e18, 0},
		{"NaN", math.NaN(), 0},
		{"positive Inf", math.Inf(1), 0},
		{"negative Inf", math.Inf(-1), 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := habitify.Habit{
				ID:        "h-1",
				Name:      "Test",
				StartDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				LogMethod: "check",
				Priority:  tt.priority,
			}
			result := TransformHabit(h, "user-1", nil)
			if result.SortOrder != tt.want {
				t.Errorf("priority %v: expected sort_order %d, got %d", tt.priority, tt.want, result.SortOrder)
			}
		})
	}
}

func TestTransformLog(t *testing.T) {
	l := habitify.Log{
		ID:          "log-1",
		HabitID:     "h-1",
		Value:       1,
		CreatedDate: time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC),
		UnitType:    "count",
	}

	result := TransformLog(l, "habity-habit-1", "user-1", time.UTC)

	if result.UserID != "user-1" {
		t.Errorf("expected user-1, got %s", result.UserID)
	}
	if result.HabitID != "habity-habit-1" {
		t.Errorf("expected habity-habit-1, got %s", result.HabitID)
	}
	if result.Value != 1 {
		t.Errorf("expected value 1, got %f", result.Value)
	}
	if result.TargetDate != "2024-01-15" {
		t.Errorf("expected 2024-01-15, got %s", result.TargetDate)
	}
	if result.Status != "completed" {
		t.Errorf("expected completed, got %s", result.Status)
	}
	if result.ExternalID != "log-1" {
		t.Errorf("expected log-1, got %s", result.ExternalID)
	}
	if !result.CompletedAt.Equal(l.CreatedDate) {
		t.Errorf("expected completed_at to equal created_date")
	}
}

func TestTransformLog_TimezoneConversion(t *testing.T) {
	jst := time.FixedZone("JST", 9*60*60)

	tests := []struct {
		name       string
		utcTime    time.Time
		loc        *time.Location
		wantDate   string
	}{
		{
			name:     "UTC midnight stays same date in UTC",
			utcTime:  time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
			loc:      time.UTC,
			wantDate: "2026-02-10",
		},
		{
			name:     "UTC 23:00 becomes next day in JST",
			utcTime:  time.Date(2026, 2, 9, 23, 0, 0, 0, time.UTC),
			loc:      jst,
			wantDate: "2026-02-10",
		},
		{
			name:     "UTC 14:00 stays same day in JST (23:00 JST)",
			utcTime:  time.Date(2026, 2, 10, 14, 0, 0, 0, time.UTC),
			loc:      jst,
			wantDate: "2026-02-10",
		},
		{
			name:     "UTC 15:00 becomes next day in JST (00:00 JST)",
			utcTime:  time.Date(2026, 2, 10, 15, 0, 0, 0, time.UTC),
			loc:      jst,
			wantDate: "2026-02-11",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			l := habitify.Log{
				ID:          "log-1",
				HabitID:     "h-1",
				Value:       1,
				CreatedDate: tt.utcTime,
			}
			result := TransformLog(l, "habity-habit-1", "user-1", tt.loc)
			if result.TargetDate != tt.wantDate {
				t.Errorf("expected target_date %s, got %s", tt.wantDate, result.TargetDate)
			}
		})
	}
}
