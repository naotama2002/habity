/**
 * Data transformation: Habitify → Habity
 * Ported from: backend/internal/service/transform.go
 */

import type { HabitifyHabit, HabitifyLog, HabitifyGoal } from './types';

// ─── Output types ──────────────────────────────────────

export interface HabityHabit {
  user_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  tracking_type: string;
  goal_value: number;
  goal_unit: string;
  goal_period: string;
  recurrence_rule: string | null;
  time_of_day: string[];
  reminder_enabled: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
  sort_order: number;
  external_id: string;
  external_source: string;
}

export interface HabityLog {
  user_id: string;
  habit_id: string;
  value: number;
  target_date: string;
  completed_at: string;
  status: string;
  external_id: string;
}

// ─── Main transform functions ──────────────────────────

/** Convert a Habitify habit to a Habity habit. */
export function transformHabit(
  h: HabitifyHabit,
  userId: string,
  categoryMap: Record<string, string>,
): HabityHabit {
  const trackingType = mapLogMethod(h.log_method);
  const { value: goalValue, unit: goalUnit, period: goalPeriod } = mapGoal(h.goal);
  const status = mapStatus(h.is_archived);
  const timeOfDay = mapTimeOfDay(h.time_of_day);
  const startDate = h.start_date.slice(0, 10); // "YYYY-MM-DD"

  const recurrenceRule = h.recurrence || null;

  let categoryId: string | null = null;
  if (h.area && categoryMap[h.area.id]) {
    categoryId = categoryMap[h.area.id];
  }

  return {
    user_id: userId,
    name: h.name,
    description: null,
    category_id: categoryId,
    tracking_type: trackingType,
    goal_value: goalValue,
    goal_unit: goalUnit,
    goal_period: goalPeriod,
    recurrence_rule: recurrenceRule,
    time_of_day: timeOfDay,
    reminder_enabled: false,
    start_date: startDate,
    end_date: null,
    status,
    sort_order: safePriorityToInt(h.priority),
    external_id: h.id,
    external_source: 'habitify',
  };
}

/**
 * Convert a Habitify log to a Habity log.
 * @param timezone IANA timezone string (e.g. "Asia/Tokyo") to determine the correct target_date.
 */
export function transformLog(
  l: HabitifyLog,
  habityHabitId: string,
  userId: string,
  timezone: string,
): HabityLog {
  const createdDate = new Date(l.created_date);
  const targetDate = formatDateInTimezone(createdDate, timezone);

  return {
    user_id: userId,
    habit_id: habityHabitId,
    value: l.value,
    target_date: targetDate,
    completed_at: l.created_date,
    status: 'completed',
    external_id: l.id,
  };
}

// ─── Mapping helpers ───────────────────────────────────

export function mapLogMethod(logMethod: string): string {
  switch (logMethod) {
    case 'check':
      return 'boolean';
    case 'measure':
    case 'number':
      return 'numeric';
    case 'timer':
      return 'duration';
    default:
      return 'boolean';
  }
}

export function mapGoal(goal: HabitifyGoal | null): {
  value: number;
  unit: string;
  period: string;
} {
  if (!goal) {
    return { value: 1, unit: 'times', period: 'daily' };
  }
  return {
    value: goal.value,
    unit: mapGoalUnit(goal.unit_type),
    period: mapGoalPeriod(goal.periodicity),
  };
}

export function mapGoalUnit(unitType: string): string {
  switch (unitType) {
    case 'count':
      return 'times';
    case 'minute':
      return 'min';
    case 'hour':
      return 'hours';
    case 'meter':
      return 'm';
    case 'kilometer':
      return 'km';
    default:
      return unitType;
  }
}

function mapStatus(isArchived: boolean): string {
  return isArchived ? 'archived' : 'active';
}

export function mapGoalPeriod(periodicity: string): string {
  switch (periodicity) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      return periodicity;
    default:
      return 'daily';
  }
}

export function mapTimeOfDay(times: string[]): string[] {
  if (!times || times.length === 0) {
    return ['anytime'];
  }

  const valid = new Set(['anytime', 'morning', 'afternoon', 'evening', 'night']);
  const result = times.filter((t) => valid.has(t));

  if (result.length === 0) {
    return ['anytime'];
  }
  return result;
}

export function safePriorityToInt(p: number): number {
  if (!Number.isFinite(p) || p > 2147483647 || p < -2147483648) {
    return 0;
  }
  return Math.trunc(p);
}

// ─── Internal helpers ──────────────────────────────────

function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;

  return `${year}-${month}-${day}`;
}
