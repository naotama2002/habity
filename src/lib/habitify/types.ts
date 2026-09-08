/**
 * Habitify API v2 types — Zod schemas with inferred TypeScript types
 * API docs: https://api-docs.habitify.me/api#description/introduction
 */

import { z } from 'zod';

// ─── Shared / embedded objects ────────────────────────

/** An area (category) embedded in a Habit. */
export const HabitifyAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  colorHex: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});
export type HabitifyArea = z.infer<typeof HabitifyAreaSchema>;

/** A habit's goal configuration (v2). */
export const HabitifyGoalSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  periodicity: z.string(),
  value: z.number(),
  unit: z.string(),
  isActive: z.boolean(),
});
export type HabitifyGoal = z.infer<typeof HabitifyGoalSchema>;

/** Occurrence — union of known scheduling types, with a passthrough fallback
 * for unknown/future types so the API adding new occurrence kinds doesn't
 * break parsing of the whole habit. */
export const HabitifyOccurrenceSchema = z.union([
  z.object({ type: z.literal('daily') }),
  z.object({ type: z.literal('weekDays'), days: z.array(z.number()) }),
  z.object({ type: z.literal('intervalDays'), interval: z.number() }),
  z.object({ type: z.string() }).passthrough(),
]);
export type HabitifyOccurrence = z.infer<typeof HabitifyOccurrenceSchema>;

/** Time-of-day period embedded in a habit. */
export const HabitifyTimeOfDaySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  colorHex: z.string().nullable().optional(),
});
export type HabitifyTimeOfDay = z.infer<typeof HabitifyTimeOfDaySchema>;

// ─── Habit ────────────────────────────────────────────

/** A habit from the Habitify API v2. */
export const HabitifyHabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  colorHex: z.string().nullable().optional(),
  type: z.string().optional(),
  description: z.string().nullable().optional(),
  occurrence: HabitifyOccurrenceSchema,
  startDate: z.string(),
  createdAt: z.string(),
  isArchived: z.boolean(),
  logMethod: z.string(),
  goals: z.array(HabitifyGoalSchema),
  areas: z.array(HabitifyAreaSchema),
  timeOfDays: z.array(HabitifyTimeOfDaySchema),
});
export type HabitifyHabit = z.infer<typeof HabitifyHabitSchema>;

// ─── Statistics / DailyProgress ───────────────────────

/** A single day's progress from the statistics endpoint. */
export const HabitifyDailyProgressSchema = z.object({
  date: z.string(),
  totalLog: z.number(),
  status: z.string(),
});
export type HabitifyDailyProgress = z.infer<typeof HabitifyDailyProgressSchema>;

/** Statistics unit object. */
export const HabitifyStatisticsUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
});

/** Response data from GET /habits/{habitId}/statistics. */
export const HabitifyStatisticsSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  totalLogs: z.number(),
  skips: z.number(),
  fails: z.number(),
  completions: z.number(),
  unit: HabitifyStatisticsUnitSchema.nullable().optional(),
  periodicity: z.string().optional(),
  avg: z.number().optional(),
  dailyProgress: z.array(HabitifyDailyProgressSchema),
});
export type HabitifyStatistics = z.infer<typeof HabitifyStatisticsSchema>;

// ─── v2 Response wrappers ─────────────────────────────

/** Pagination info returned by v2 list endpoints. */
export const HabitifyPaginationSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

/** Generic wrapper for Habitify API v2 responses. */
export const HabitifyV2ResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    pagination: HabitifyPaginationSchema.optional(),
  });
export type HabitifyV2Response<T> = {
  data: T;
  pagination?: { total: number; limit: number; offset: number };
};

/**
 * Response envelope for the habits list endpoint, with `data` treated as an
 * array of unknown elements so each habit can be validated individually
 * (one malformed habit shouldn't fail the whole page). `data` is also
 * accepted as `null` (some API responses omit it entirely for empty pages).
 */
export const HabitifyHabitsEnvelopeSchema = z.object({
  data: z.array(z.unknown()).nullable(),
  pagination: HabitifyPaginationSchema.optional(),
});
