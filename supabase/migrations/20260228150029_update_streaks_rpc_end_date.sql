-- Update calculate_streaks to support end_date
-- When a habit has an end_date in the past, start scanning from end_date instead of p_today

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
    SELECT h.id, h.recurrence_rule, h.start_date, h.end_date
    FROM habits h
    WHERE h.id = ANY(p_habit_ids)
  LOOP
    -- Clamp start date: use LEAST(p_today, end_date) if end_date is set
    v_date := LEAST(p_today, COALESCE(v_habit.end_date, p_today));
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
