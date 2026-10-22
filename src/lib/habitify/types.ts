/**
 * Habitify API types — schemas with inferred TypeScript types
 * Ported from: backend/internal/habitify/types.go
 */

import {
  boolean,
  number,
  object,
  string,
  type Infer,
  type Validator,
} from '@/lib/validate';

/** An area (category) embedded in a Habit. */
export const HabitifyAreaSchema = object({
  id: string(),
  name: string(),
});
export type HabitifyArea = Infer<typeof HabitifyAreaSchema>;

/** A habit's goal configuration. */
export const HabitifyGoalSchema = object({
  unit_type: string(),
  value: number(),
  periodicity: string(),
});
export type HabitifyGoal = Infer<typeof HabitifyGoalSchema>;

/** A habit from the Habitify API. */
export const HabitifyHabitSchema = object({
  id: string(),
  name: string(),
  is_archived: boolean(),
  start_date: string(),
  time_of_day: string().array(),
  area: HabitifyAreaSchema.nullable(),
  recurrence: string(),
  goal: HabitifyGoalSchema.nullable(),
  log_method: string(),
  priority: number(),
  created_date: string(),
});
export type HabitifyHabit = Infer<typeof HabitifyHabitSchema>;

/** A log entry from the Habitify API. */
export const HabitifyLogSchema = object({
  id: string(),
  habit_id: string(),
  value: number(),
  created_date: string(),
  unit_type: string(),
});
export type HabitifyLog = Infer<typeof HabitifyLogSchema>;

/** Generic wrapper for Habitify API responses. */
export const HabitifyResponseSchema = <T>(dataSchema: Validator<T>) =>
  object({
    message: string(),
    data: dataSchema,
    status: boolean(),
    version: string(),
  });
export type HabitifyResponse<T> = {
  message: string;
  data: T;
  status: boolean;
  version: string;
};
