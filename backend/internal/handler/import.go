package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/naotama2002/habity/backend/internal/service"
)

// ImportHabitifyRequest represents the request body for Habitify import.
type ImportHabitifyRequest struct {
	APIKey       string `json:"api_key"`
	ImportHabits bool   `json:"import_habits"`
	ImportLogs   bool   `json:"import_logs"`
	Timezone     string `json:"timezone"`
}

// ImportHabitifyResponse represents the response for Habitify import.
type ImportHabitifyResponse struct {
	Status         string   `json:"status"`
	HabitsImported int      `json:"habits_imported"`
	LogsImported   int      `json:"logs_imported"`
	Errors         []string `json:"errors,omitempty"`
}

// ImportHabitify handles the Habitify import request.
func ImportHabitify(pool *pgxpool.Pool) http.HandlerFunc {
	svc := service.NewImportService(pool)

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

		result, err := svc.Run(r.Context(), userID, req.APIKey, req.ImportHabits, req.ImportLogs, req.Timezone)
		if err != nil {
			log.Printf("Import error for user %s: %v", userID, err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(map[string]string{
				"error": err.Error(),
			})
			return
		}

		response := ImportHabitifyResponse{
			Status:         "completed",
			HabitsImported: result.HabitsImported,
			LogsImported:   result.LogsImported,
			Errors:         result.Errors,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
