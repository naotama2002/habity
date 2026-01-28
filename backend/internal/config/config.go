package config

import (
	"os"
)

// Config holds the application configuration
type Config struct {
	Port              string
	DatabaseURL       string
	SupabaseURL       string
	SupabaseServiceKey string
	JWTSecret         string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"),
		SupabaseURL:       getEnv("SUPABASE_URL", "http://localhost:54321"),
		SupabaseServiceKey: getEnv("SUPABASE_SERVICE_KEY", ""),
		JWTSecret:         getEnv("JWT_SECRET", "super-secret-jwt-token-with-at-least-32-characters"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
