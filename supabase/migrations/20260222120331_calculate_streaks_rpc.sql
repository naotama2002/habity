-- ===========================================
-- Helper: Check if a date matches a recurrence rule
-- Equivalent to src/lib/recurrence.ts isDateMatchingRRule
-- ===========================================

CREATE OR REPLACE FUNCTION _is_scheduled_date(
  p_date DATE,
  p_recurrence_rule TEXT,
  p_start_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_rule_line TEXT;
  v_lines TEXT[];
  v_line TEXT;
  v_freq TEXT;
  v_byday TEXT;
  v_bymonthday TEXT;
  v_interval_str TEXT;
  v_interval INT;
  v_dow INT;  -- 0=Sun, 1=Mon, ..., 6=Sat (PostgreSQL EXTRACT(DOW))
  v_rrule_day TEXT;
  v_days TEXT[];
  v_monthdays TEXT[];
  v_diff INT;
BEGIN
  -- NULL rule means every day
  IF p_recurrence_rule IS NULL OR p_recurrence_rule = '' THEN
    RETURN TRUE;
  END IF;

  -- Extract RRULE: line from multi-line format (Habitify format)
  v_rule_line := p_recurrence_rule;
  v_lines := string_to_array(p_recurrence_rule, E'\n');
  FOREACH v_line IN ARRAY v_lines LOOP
    IF v_line LIKE 'RRULE:%' THEN
      v_rule_line := v_line;
      EXIT;
    END IF;
  END LOOP;

  -- Remove RRULE: prefix if present
  IF v_rule_line LIKE 'RRULE:%' THEN
    v_rule_line := substring(v_rule_line FROM 7);
  END IF;

  -- Parse FREQ
  v_freq := NULL;
  IF v_rule_line ~ 'FREQ=WEEKLY' THEN
    v_freq := 'WEEKLY';
  ELSIF v_rule_line ~ 'FREQ=MONTHLY' THEN
    v_freq := 'MONTHLY';
  ELSIF v_rule_line ~ 'FREQ=DAILY' THEN
    v_freq := 'DAILY';
  END IF;

  -- WEEKLY: check day of week
  IF v_freq = 'WEEKLY' THEN
    -- Extract BYDAY value
    v_byday := (regexp_match(v_rule_line, 'BYDAY=([A-Z,]+)'))[1];
    IF v_byday IS NULL THEN
      RETURN TRUE;
    END IF;

    -- PostgreSQL DOW: 0=Sun, 1=Mon, ..., 6=Sat
    v_dow := EXTRACT(DOW FROM p_date)::INT;
    -- Convert to RRULE day abbreviation
    v_rrule_day := CASE v_dow
      WHEN 0 THEN 'SU'
      WHEN 1 THEN 'MO'
      WHEN 2 THEN 'TU'
      WHEN 3 THEN 'WE'
      WHEN 4 THEN 'TH'
      WHEN 5 THEN 'FR'
      WHEN 6 THEN 'SA'
    END;

    RETURN v_byday LIKE '%' || v_rrule_day || '%';
  END IF;

  -- MONTHLY: check day of month
  IF v_freq = 'MONTHLY' THEN
    v_bymonthday := (regexp_match(v_rule_line, 'BYMONTHDAY=([0-9,]+)'))[1];
    IF v_bymonthday IS NULL THEN
      RETURN TRUE;
    END IF;

    v_monthdays := string_to_array(v_bymonthday, ',');
    RETURN EXTRACT(DAY FROM p_date)::TEXT = ANY(v_monthdays);
  END IF;

  -- DAILY: check interval
  IF v_freq = 'DAILY' THEN
    v_interval_str := (regexp_match(v_rule_line, 'INTERVAL=([0-9]+)'))[1];
    v_interval := COALESCE(v_interval_str::INT, 1);

    IF v_interval <= 1 THEN
      RETURN TRUE;
    END IF;

    -- Check if (p_date - p_start_date) is divisible by interval
    v_diff := p_date - p_start_date;
    IF v_diff < 0 THEN
      RETURN FALSE;
    END IF;
    RETURN (v_diff % v_interval) = 0;
  END IF;

  -- Unknown FREQ: default to every day
  RETURN TRUE;
END;
$$;

-- ===========================================
-- Main RPC: Calculate streaks for multiple habits
-- Equivalent to src/lib/streak.ts calculateStreaks
-- ===========================================

CREATE OR REPLACE FUNCTION calculate_streaks(
  p_habit_ids UUID[],
  p_today DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(habit_id UUID, streak_count INT, streak_from DATE)
LANGUAGE plpgsql
SECURITY INVOKER  -- RLS applied
AS $$
DECLARE
  v_habit RECORD;
  v_date DATE;
  v_streak INT;
  v_from DATE;
  v_days_checked INT;
  v_status TEXT;
  v_max_lookback INT := 36500;  -- 100 years safety limit
BEGIN
  FOR v_habit IN
    SELECT h.id, h.recurrence_rule, h.start_date
    FROM habits h
    WHERE h.id = ANY(p_habit_ids)
  LOOP
    v_date := p_today;
    v_streak := 0;
    v_from := NULL;
    v_days_checked := 0;

    WHILE v_days_checked < v_max_lookback LOOP
      -- Don't look before habit start_date
      EXIT WHEN v_date < v_habit.start_date;

      -- Skip non-scheduled dates
      IF NOT _is_scheduled_date(v_date, v_habit.recurrence_rule, v_habit.start_date) THEN
        v_date := v_date - 1;
        v_days_checked := v_days_checked + 1;
        CONTINUE;
      END IF;

      -- Look up log status
      SELECT l.status::TEXT INTO v_status
      FROM habit_logs l
      WHERE l.habit_id = v_habit.id AND l.target_date = v_date
      LIMIT 1;

      IF v_status = 'completed' THEN
        v_streak := v_streak + 1;
        v_from := v_date;
      ELSIF v_status = 'skipped' THEN
        -- Skipped maintains streak without incrementing count
        v_from := v_date;
      ELSE
        -- No log or other status: streak broken
        EXIT;
      END IF;

      v_date := v_date - 1;
      v_days_checked := v_days_checked + 1;
    END LOOP;

    -- Only return rows where streak > 0 (from is not null)
    IF v_streak > 0 THEN
      habit_id := v_habit.id;
      streak_count := v_streak;
      streak_from := v_from;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ===========================================
-- Drop old functions (unused in the app)
-- get_habit_stats depends on calculate_streak, so drop it first
-- ===========================================

DROP FUNCTION IF EXISTS get_habit_stats(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS calculate_streak(UUID);
