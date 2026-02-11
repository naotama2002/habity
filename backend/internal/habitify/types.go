package habitify

import "time"

// Response is the generic wrapper for Habitify API responses.
type Response[T any] struct {
	Message string `json:"message"`
	Data    T      `json:"data"`
	Status  bool   `json:"status"`
	Version string `json:"version"`
}

// Habit represents a habit from the Habitify API.
type Habit struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	IsArchived  bool      `json:"is_archived"`
	StartDate   time.Time `json:"start_date"`
	TimeOfDay   []string  `json:"time_of_day"`
	Area        *Area     `json:"area"`
	Recurrence  string    `json:"recurrence"`
	Goal        *Goal     `json:"goal"`
	LogMethod   string    `json:"log_method"`
	Priority    float64   `json:"priority"`
	CreatedDate time.Time `json:"created_date"`
}

// Log represents a log entry from the Habitify API.
type Log struct {
	ID          string    `json:"id"`
	HabitID     string    `json:"habit_id"`
	Value       float64   `json:"value"`
	CreatedDate time.Time `json:"created_date"`
	UnitType    string    `json:"unit_type"`
}

// Area represents an area (category) embedded in a Habit.
type Area struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Goal represents a habit's goal configuration.
type Goal struct {
	UnitType    string  `json:"unit_type"`
	Value       float64 `json:"value"`
	Periodicity string  `json:"periodicity"`
}
