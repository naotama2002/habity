-- ===========================================
-- Habity Database Schema
-- ===========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Enum Types
-- ===========================================

CREATE TYPE tracking_type AS ENUM ('boolean', 'numeric', 'duration');
CREATE TYPE habit_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE goal_period AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE time_of_day AS ENUM ('anytime', 'morning', 'afternoon', 'evening', 'night');

-- ===========================================
-- Categories Table
-- ===========================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- Habits Table
-- ===========================================

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Tracking settings
  tracking_type tracking_type DEFAULT 'boolean',
  goal_value NUMERIC DEFAULT 1,
  goal_unit TEXT DEFAULT 'times',
  goal_period goal_period DEFAULT 'daily',

  -- Schedule
  recurrence_rule TEXT,
  time_of_day time_of_day[] DEFAULT '{anytime}',
  reminder_times TIME[],
  reminder_enabled BOOLEAN DEFAULT false,

  -- Status
  start_date DATE DEFAULT CURRENT_DATE,
  status habit_status DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,

  -- Import reference
  external_id TEXT,
  external_source TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_user_status ON habits(user_id, status);
CREATE INDEX idx_habits_category_id ON habits(category_id);
CREATE INDEX idx_habits_external ON habits(external_source, external_id);

-- RLS for habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- Habit Logs Table
-- ===========================================

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  -- Log content
  value NUMERIC NOT NULL DEFAULT 1,
  note TEXT,

  -- Date/time
  completed_at TIMESTAMPTZ NOT NULL,
  target_date DATE NOT NULL,

  -- Import reference
  external_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per habit per day
  UNIQUE(habit_id, target_date)
);

CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_target_date ON habit_logs(target_date);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, target_date);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, target_date);

-- RLS for habit_logs
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON habit_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON habit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- User Settings Table
-- ===========================================

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display settings
  theme TEXT DEFAULT 'system',
  locale TEXT DEFAULT 'ja',
  timezone TEXT DEFAULT 'Asia/Tokyo',
  week_start INTEGER DEFAULT 1,

  -- Notification settings
  notifications_enabled BOOLEAN DEFAULT true,
  daily_reminder_time TIME DEFAULT '08:00',

  -- Sync settings
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ===========================================
-- Triggers
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Function to create default settings for new users
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- Views
-- ===========================================

-- View: Habits with today's log status
CREATE OR REPLACE VIEW habits_with_today_log AS
SELECT
  h.*,
  l.id AS log_id,
  l.value AS log_value,
  l.completed_at AS log_completed_at,
  l.note AS log_note,
  CASE
    WHEN l.id IS NOT NULL AND l.value >= h.goal_value THEN true
    ELSE false
  END AS is_completed_today
FROM habits h
LEFT JOIN habit_logs l ON h.id = l.habit_id AND l.target_date = CURRENT_DATE;

-- ===========================================
-- Functions
-- ===========================================

-- Function to calculate streak for a habit
CREATE OR REPLACE FUNCTION calculate_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_date DATE := CURRENT_DATE;
  v_has_log BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM habit_logs
      WHERE habit_id = p_habit_id AND target_date = v_date
    ) INTO v_has_log;

    IF v_has_log THEN
      v_streak := v_streak + 1;
      v_date := v_date - 1;
    ELSE
      EXIT;
    END IF;

    -- Safety limit
    IF v_streak > 1000 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to get habit statistics
CREATE OR REPLACE FUNCTION get_habit_stats(
  p_habit_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_days INTEGER,
  completed_days INTEGER,
  completion_rate NUMERIC,
  current_streak INTEGER,
  longest_streak INTEGER
) AS $$
DECLARE
  v_current_streak INTEGER;
  v_longest_streak INTEGER := 0;
  v_temp_streak INTEGER := 0;
  v_date DATE;
  v_has_log BOOLEAN;
BEGIN
  -- Calculate current streak
  v_current_streak := calculate_streak(p_habit_id);

  -- Calculate longest streak in period
  v_date := p_from_date;
  WHILE v_date <= p_to_date LOOP
    SELECT EXISTS(
      SELECT 1 FROM habit_logs
      WHERE habit_id = p_habit_id AND target_date = v_date
    ) INTO v_has_log;

    IF v_has_log THEN
      v_temp_streak := v_temp_streak + 1;
      IF v_temp_streak > v_longest_streak THEN
        v_longest_streak := v_temp_streak;
      END IF;
    ELSE
      v_temp_streak := 0;
    END IF;

    v_date := v_date + 1;
  END LOOP;

  RETURN QUERY
  SELECT
    (p_to_date - p_from_date + 1)::INTEGER AS total_days,
    COUNT(l.id)::INTEGER AS completed_days,
    ROUND(COUNT(l.id)::NUMERIC / (p_to_date - p_from_date + 1) * 100, 1) AS completion_rate,
    v_current_streak AS current_streak,
    v_longest_streak AS longest_streak
  FROM habit_logs l
  WHERE l.habit_id = p_habit_id
    AND l.target_date BETWEEN p_from_date AND p_to_date;
END;
$$ LANGUAGE plpgsql;
