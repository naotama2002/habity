-- Allow calculate_streaks to preview streaks for today/future dates with no log yet.
-- This is used by the Today screen to show the existing streak in an inactive state
-- before the selected date has been completed.

CREATE OR REPLACE FUNCTION calculate_streaks(
  p_habit_ids UUID[],
  p_today DATE DEFAULT CURRENT_DATE,
  p_preview_pending BOOLEAN DEFAULT FALSE
) RETURNS TABLE(habit_id UUID, streak_count INT, streak_from DATE)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_habit RECORD;
  v_date DATE;
  v_streak INT;
  v_from DATE;
  v_days_checked INT;
  v_status TEXT;
BEGIN
  FOR v_habit IN
    SELECT h.id, h.recurrence_rule, h.start_date, h.end_date
    FROM habits h
    WHERE h.id = ANY(p_habit_ids)
  LOOP
    v_date := LEAST(p_today, COALESCE(v_habit.end_date, p_today));
    v_streak := 0;
    v_from := NULL;
    v_days_checked := 0;

    IF p_preview_pending THEN
      LOOP
        EXIT WHEN v_date < CURRENT_DATE;
        EXIT WHEN v_date < v_habit.start_date;

        IF NOT _is_scheduled_date(v_date, v_habit.recurrence_rule, v_habit.start_date) THEN
          v_date := v_date - 1;
          CONTINUE;
        END IF;

        SELECT l.status::TEXT INTO v_status
        FROM habit_logs l
        WHERE l.habit_id = v_habit.id AND l.target_date = v_date
        LIMIT 1;

        EXIT WHEN v_status IS NOT NULL;
        v_date := v_date - 1;
      END LOOP;
    END IF;

    WHILE v_days_checked < 36500 LOOP
      EXIT WHEN v_date < v_habit.start_date;

      IF NOT _is_scheduled_date(v_date, v_habit.recurrence_rule, v_habit.start_date) THEN
        v_date := v_date - 1;
        v_days_checked := v_days_checked + 1;
        CONTINUE;
      END IF;

      SELECT l.status::TEXT INTO v_status
      FROM habit_logs l
      WHERE l.habit_id = v_habit.id AND l.target_date = v_date
      LIMIT 1;

      IF v_status = 'completed' THEN
        v_streak := v_streak + 1;
        v_from := v_date;
      ELSIF v_status = 'skipped' THEN
        v_from := v_date;
      ELSE
        EXIT;
      END IF;

      v_date := v_date - 1;
      v_days_checked := v_days_checked + 1;
    END LOOP;

    IF v_streak > 0 THEN
      habit_id := v_habit.id;
      streak_count := v_streak;
      streak_from := v_from;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;
