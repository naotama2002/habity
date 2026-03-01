-- Add optional end_date column to habits table
ALTER TABLE habits ADD COLUMN end_date DATE DEFAULT NULL;

-- Ensure end_date is on or after start_date (if set)
ALTER TABLE habits ADD CONSTRAINT chk_habits_end_date_after_start
  CHECK (end_date IS NULL OR end_date >= start_date);
