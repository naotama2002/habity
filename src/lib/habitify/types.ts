/**
 * Habitify API types — Zod schemas with inferred TypeScript types
 * Ported from: backend/internal/habitify/types.go
 */

import { z } from 'zod';

/** An area (category) embedded in a Habit. */
export const HabitifyAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type HabitifyArea = z.infer<typeof HabitifyAreaSchema>;

/** A habit's goal configuration. */
export const HabitifyGoalSchema = z.object({
  unit_type: z.string(),
  value: z.number(),
  periodicity: z.string(),
});
export type HabitifyGoal = z.infer<typeof HabitifyGoalSchema>;

/** A habit from the Habitify API. */
export const HabitifyHabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_archived: z.boolean(),
  start_date: z.string(),
  time_of_day: z.array(z.string()),
  area: HabitifyAreaSchema.nullable(),
  recurrence: z.string(),
  goal: HabitifyGoalSchema.nullable(),
  log_method: z.string(),
  priority: z.number(),
  created_date: z.string(),
});
export type HabitifyHabit = z.infer<typeof HabitifyHabitSchema>;

/** A log entry from the Habitify API. */
export const HabitifyLogSchema = z.object({
  id: z.string(),
  habit_id: z.string(),
  value: z.number(),
  created_date: z.string(),
  unit_type: z.string(),
});
export type HabitifyLog = z.infer<typeof HabitifyLogSchema>;

/** Generic wrapper for Habitify API responses. */
export const HabitifyResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    message: z.string(),
    data: dataSchema,
    status: z.boolean(),
    version: z.string(),
  });
export type HabitifyResponse<T> = {
  message: string;
  data: T;
  status: boolean;
  version: string;
};
