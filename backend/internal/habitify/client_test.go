package habitify

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGetHabits(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/habits" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "test-api-key" {
			t.Errorf("unexpected auth header: %s", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"message": "OK",
			"data": [
				{
					"id": "habit-1",
					"name": "Morning Run",
					"is_archived": false,
					"start_date": "2024-01-01T00:00:00Z",
					"time_of_day": ["morning"],
					"area": {"id": "area-1", "name": "Health"},
					"recurrence": "RRULE:FREQ=DAILY",
					"goal": {"unit_type": "count", "value": 1, "periodicity": "daily"},
					"log_method": "check",
					"priority": 1,
					"created_date": "2024-01-01T00:00:00Z"
				}
			],
			"status": true,
			"version": "v1.2"
		}`))
	}))
	defer server.Close()

	client := NewClientWithBaseURL("test-api-key", server.URL)
	habits, err := client.GetHabits(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(habits) != 1 {
		t.Fatalf("expected 1 habit, got %d", len(habits))
	}

	h := habits[0]
	if h.ID != "habit-1" {
		t.Errorf("expected ID habit-1, got %s", h.ID)
	}
	if h.Name != "Morning Run" {
		t.Errorf("expected name Morning Run, got %s", h.Name)
	}
	if h.IsArchived {
		t.Error("expected is_archived to be false")
	}
	if h.Area == nil || h.Area.ID != "area-1" {
		t.Error("expected area to be present with ID area-1")
	}
	if h.Goal == nil || h.Goal.Value != 1 {
		t.Error("expected goal with value 1")
	}
	if h.LogMethod != "check" {
		t.Errorf("expected log_method check, got %s", h.LogMethod)
	}
}

func TestGetHabitsUnauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewClientWithBaseURL("bad-key", server.URL)
	_, err := client.GetHabits(context.Background())
	if err == nil {
		t.Fatal("expected error for unauthorized request")
	}
}

func TestGetLogs(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/logs/habit-1" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		from := r.URL.Query().Get("from")
		to := r.URL.Query().Get("to")
		if from == "" || to == "" {
			t.Error("expected from and to query parameters")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"message": "OK",
			"data": [
				{
					"id": "log-1",
					"habit_id": "habit-1",
					"value": 1,
					"created_date": "2024-01-15T10:30:00Z",
					"unit_type": "count"
				},
				{
					"id": "log-2",
					"habit_id": "habit-1",
					"value": 2.5,
					"created_date": "2024-01-16T08:00:00Z",
					"unit_type": "count"
				}
			],
			"status": true,
			"version": "v1.2"
		}`))
	}))
	defer server.Close()

	client := NewClientWithBaseURL("test-api-key", server.URL)
	from := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2024, 1, 31, 0, 0, 0, 0, time.UTC)

	logs, err := client.GetLogs(context.Background(), "habit-1", from, to)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(logs) != 2 {
		t.Fatalf("expected 2 logs, got %d", len(logs))
	}

	if logs[0].ID != "log-1" {
		t.Errorf("expected log ID log-1, got %s", logs[0].ID)
	}
	if logs[0].Value != 1 {
		t.Errorf("expected value 1, got %f", logs[0].Value)
	}
	if logs[1].Value != 2.5 {
		t.Errorf("expected value 2.5, got %f", logs[1].Value)
	}
}

func TestValidate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"OK","data":[],"status":true,"version":"v1.2"}`))
	}))
	defer server.Close()

	client := NewClientWithBaseURL("test-api-key", server.URL)
	err := client.Validate(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateInvalidKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewClientWithBaseURL("bad-key", server.URL)
	err := client.Validate(context.Background())
	if err == nil {
		t.Fatal("expected error for invalid key")
	}
}

func TestGetHabitsWithNullArea(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"message": "OK",
			"data": [
				{
					"id": "habit-1",
					"name": "Read",
					"is_archived": false,
					"start_date": "2024-01-01T00:00:00Z",
					"time_of_day": [],
					"area": null,
					"recurrence": "RRULE:FREQ=DAILY",
					"goal": null,
					"log_method": "check",
					"priority": 0,
					"created_date": "2024-01-01T00:00:00Z"
				}
			],
			"status": true,
			"version": "v1.2"
		}`))
	}))
	defer server.Close()

	client := NewClientWithBaseURL("test-api-key", server.URL)
	habits, err := client.GetHabits(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(habits) != 1 {
		t.Fatalf("expected 1 habit, got %d", len(habits))
	}
	if habits[0].Area != nil {
		t.Error("expected area to be nil")
	}
	if habits[0].Goal != nil {
		t.Error("expected goal to be nil")
	}
}

func TestGetHabitsAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"Invalid API key","data":null,"status":false,"version":"v1.2"}`))
	}))
	defer server.Close()

	client := NewClientWithBaseURL("test-api-key", server.URL)
	_, err := client.GetHabits(context.Background())
	if err == nil {
		t.Fatal("expected error for API error response")
	}
}
