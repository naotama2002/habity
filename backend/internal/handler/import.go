package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/naotama2002/habity/backend/internal/config"
)

// ImportHabitifyRequest represents the request body for Habitify import
type ImportHabitifyRequest struct {
	APIKey        string `json:"api_key"`
	ImportHabits  bool   `json:"import_habits"`
	ImportLogs    bool   `json:"import_logs"`
	ImportAreas   bool   `json:"import_areas"`
	LogDateFrom   string `json:"log_date_from,omitempty"`
	LogDateTo     string `json:"log_date_to,omitempty"`
}

// ImportHabitifyResponse represents the response for Habitify import
type ImportHabitifyResponse struct {
	JobID   string `json:"job_id"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

// ImportStatusResponse represents the status of an import job
type ImportStatusResponse struct {
	JobID          string `json:"job_id"`
	Status         string `json:"status"` // pending, processing, completed, failed
	Progress       int    `json:"progress"`
	TotalHabits    int    `json:"total_habits"`
	ImportedHabits int    `json:"imported_habits"`
	TotalLogs      int    `json:"total_logs"`
	ImportedLogs   int    `json:"imported_logs"`
	Errors         []string `json:"errors,omitempty"`
	CompletedAt    string `json:"completed_at,omitempty"`
}

// ImportHabitify handles the Habitify import request
func ImportHabitify(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		if userID == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		var req ImportHabitifyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		if req.APIKey == "" {
			http.Error(w, `{"error":"api_key is required"}`, http.StatusBadRequest)
			return
		}

		// TODO: Implement actual import logic
		// 1. Validate Habitify API key
		// 2. Fetch habits from Habitify API
		// 3. Fetch logs from Habitify API
		// 4. Transform and save to database
		// 5. Return job ID for status tracking

		// For now, return a placeholder response
		response := ImportHabitifyResponse{
			JobID:   "job_" + userID[:8], // Placeholder
			Status:  "pending",
			Message: "Import job has been queued",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(response)
	}
}

// GetImportStatus returns the status of an import job
func GetImportStatus() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		jobID := chi.URLParam(r, "jobId")
		if jobID == "" {
			http.Error(w, `{"error":"job_id is required"}`, http.StatusBadRequest)
			return
		}

		// TODO: Implement actual status lookup from database/cache

		// For now, return a placeholder response
		response := ImportStatusResponse{
			JobID:          jobID,
			Status:         "pending",
			Progress:       0,
			TotalHabits:    0,
			ImportedHabits: 0,
			TotalLogs:      0,
			ImportedLogs:   0,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
