-- ===========================================
-- Add CHECK constraints for text field lengths
-- Prevents arbitrarily long strings via direct API access
-- ===========================================

-- Categories
ALTER TABLE categories
  ADD CONSTRAINT chk_categories_name_length CHECK (length(name) <= 100),
  ADD CONSTRAINT chk_categories_color_length CHECK (length(color) <= 20),
  ADD CONSTRAINT chk_categories_icon_length CHECK (length(icon) <= 50);

-- Habits
ALTER TABLE habits
  ADD CONSTRAINT chk_habits_name_length CHECK (length(name) <= 100),
  ADD CONSTRAINT chk_habits_description_length CHECK (length(description) <= 500),
  ADD CONSTRAINT chk_habits_goal_unit_length CHECK (length(goal_unit) <= 50),
  ADD CONSTRAINT chk_habits_recurrence_rule_length CHECK (length(recurrence_rule) <= 500),
  ADD CONSTRAINT chk_habits_external_id_length CHECK (length(external_id) <= 255),
  ADD CONSTRAINT chk_habits_external_source_length CHECK (length(external_source) <= 100);

-- Habit Logs
ALTER TABLE habit_logs
  ADD CONSTRAINT chk_habit_logs_note_length CHECK (length(note) <= 500),
  ADD CONSTRAINT chk_habit_logs_external_id_length CHECK (length(external_id) <= 255);

-- User Settings
ALTER TABLE user_settings
  ADD CONSTRAINT chk_user_settings_theme_length CHECK (length(theme) <= 20),
  ADD CONSTRAINT chk_user_settings_locale_length CHECK (length(locale) <= 10),
  ADD CONSTRAINT chk_user_settings_timezone_length CHECK (length(timezone) <= 50);
