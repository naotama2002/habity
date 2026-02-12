/**
 * Habitify API types
 * Ported from: backend/internal/habitify/types.go
 */

/** Generic wrapper for Habitify API responses. */
export interface HabitifyResponse<T> {
  message: string;
  data: T;
  status: boolean;
  version: string;
}

/** A habit from the Habitify API. */
export interface HabitifyHabit {
  id: string;
  name: string;
  is_archived: boolean;
  start_date: string;
  time_of_day: string[];
  area: HabitifyArea | null;
  recurrence: string;
  goal: HabitifyGoal | null;
  log_method: string;
  priority: number;
  created_date: string;
}

/** A log entry from the Habitify API. */
export interface HabitifyLog {
  id: string;
  habit_id: string;
  value: number;
  created_date: string;
  unit_type: string;
}

/** An area (category) embedded in a Habit. */
export interface HabitifyArea {
  id: string;
  name: string;
}

/** A habit's goal configuration. */
export interface HabitifyGoal {
  unit_type: string;
  value: number;
  periodicity: string;
}
