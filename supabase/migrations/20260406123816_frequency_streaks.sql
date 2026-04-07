-- Update calculate_streaks to support weekly/monthly goal_period habits.
-- For daily habits: existing day-by-day algorithm (unchanged).
-- For weekly/monthly habits: walk backward period-by-period,
-- counting consecutive periods where completed logs >= goal_value.

CREATE OR REPLACE FUNCTION calculate_streaks(
  p_habit_ids UUID[],
  p_today DATE DEFAULT CURRENT_DATE,
  p_preview_pending BOOLEAN DEFAULT FALSE,
  p_week_start INT DEFAULT 1  -- 0=Sunday, 1=Monday, ..., 6=Saturday
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
  -- Period-based variables
  v_period_start DATE;
  v_period_end DATE;
  v_completed_count INT;
  v_periods_checked INT;
BEGIN
  FOR v_habit IN
    SELECT h.id, h.recurrence_rule, h.start_date, h.end_date,
           h.goal_period, h.goal_value
    FROM habits h
    WHERE h.id = ANY(p_habit_ids)
  LOOP
    v_streak := 0;
    v_from := NULL;

    IF v_habit.goal_period IN ('weekly', 'monthly') THEN
      -- ============================================
      -- Period-based streak (weekly/monthly)
      -- ============================================
      v_date := LEAST(p_today, COALESCE(v_habit.end_date, p_today));
      v_periods_checked := 0;

      LOOP
        EXIT WHEN v_periods_checked >= 5200; -- safety limit (~100 years of weeks)

        -- Calculate period boundaries
        IF v_habit.goal_period = 'weekly' THEN
          -- Calculate week start: subtract days to reach p_week_start day
          -- PostgreSQL: EXTRACT(DOW FROM date) returns 0=Sun, 1=Mon, ..., 6=Sat
          v_period_start := v_date - ((EXTRACT(DOW FROM v_date)::INT - p_week_start + 7) % 7);
          v_period_end := v_period_start + 6;
        ELSE -- monthly
          v_period_start := DATE_TRUNC('month', v_date)::DATE;
          v_period_end := (DATE_TRUNC('month', v_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        END IF;

        -- Stop if period end is before habit start_date
        EXIT WHEN v_period_end < v_habit.start_date;

        -- Count completed logs in this period
        SELECT COUNT(*) INTO v_completed_count
        FROM habit_logs l
        WHERE l.habit_id = v_habit.id
          AND l.target_date >= v_period_start
          AND l.target_date <= v_period_end
          AND l.status = 'completed';

        IF v_completed_count >= v_habit.goal_value THEN
          v_streak := v_streak + 1;
          v_from := v_period_start;
        ELSIF p_preview_pending AND v_periods_checked = 0 THEN
          -- Preview mode: skip current period if goal not yet met
          NULL;
        ELSE
          -- Goal not met → streak broken
          EXIT;
        END IF;

        -- Move to previous period
        v_date := v_period_start - 1;
        v_periods_checked := v_periods_checked + 1;
      END LOOP;

    ELSE
      -- ============================================
      -- Daily streak (existing algorithm, unchanged)
      -- ============================================
      v_date := LEAST(p_today, COALESCE(v_habit.end_date, p_today));
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
    END IF;

    IF v_streak > 0 THEN
      habit_id := v_habit.id;
      streak_count := v_streak;
      streak_from := v_from;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;
