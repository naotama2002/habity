/**
 * Data transformation: Habitify v2 → Habity
 */

import type {
  HabitifyHabit,
  HabitifyGoal,
  HabitifyOccurrence,
  HabitifyDailyProgress,
} from './types';

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
  external_id: string | null;
}

// ─── Main transform functions ──────────────────────────

/** Convert a Habitify v2 habit to a Habity habit. */
export function transformHabit(
  h: HabitifyHabit,
  userId: string,
  categoryMap: Record<string, string>,
): HabityHabit {
  const activeGoal = findActiveGoal(h.goals);
  const trackingType = inferTrackingType(activeGoal);
  const { value: goalValue, unit: goalUnit, period: goalPeriod } = mapGoal(activeGoal);
  const status = h.isArchived ? 'archived' : 'active';
  const timeOfDay = mapTimeOfDays(h.timeOfDays);
  const recurrenceRule = occurrenceToRRule(h.occurrence);

  let categoryId: string | null = null;
  if (h.areas.length > 0 && categoryMap[h.areas[0].id]) {
    categoryId = categoryMap[h.areas[0].id];
  }

  return {
    user_id: userId,
    name: h.name,
    description: h.description ?? null,
    category_id: categoryId,
    tracking_type: trackingType,
    goal_value: goalValue,
    goal_unit: goalUnit,
    goal_period: goalPeriod,
    recurrence_rule: recurrenceRule,
    time_of_day: timeOfDay,
    reminder_enabled: false,
    start_date: h.startDate,
    end_date: null,
    status,
    sort_order: 0,
    external_id: h.id,
    external_source: 'habitify',
  };
}

/**
 * Convert a Habitify v2 dailyProgress entry to a Habity log.
 * Returns null if the status should not be imported (failed, inprogress).
 */
export function transformDailyProgress(
  dp: HabitifyDailyProgress,
  habityHabitId: string,
  userId: string,
): HabityLog | null {
  if (dp.status !== 'completed' && dp.status !== 'skipped') {
    return null;
  }

  return {
    user_id: userId,
    habit_id: habityHabitId,
    value: dp.totalLog,
    target_date: dp.date,
    completed_at: `${dp.date}T00:00:00`,
    status: dp.status,
    external_id: null,
  };
}

// ─── Goal helpers ─────────────────────────────────────

/** Find the active goal, or return null if none. */
export function findActiveGoal(goals: HabitifyGoal[]): HabitifyGoal | null {
  return goals.find((g) => g.isActive) ?? goals[0] ?? null;
}

/** Infer tracking_type from the active goal's unit. */
export function inferTrackingType(goal: HabitifyGoal | null): string {
  if (!goal) return 'boolean';

  const durationUnits = new Set(['sec', 'min', 'hr', 'ms']);
  if (durationUnits.has(goal.unit)) {
    return 'duration';
  }

  return 'numeric';
}

/** Extract goal value, unit, and period from a v2 goal. */
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
    unit: mapGoalUnit(goal.unit),
    period: mapGoalPeriod(goal.periodicity),
  };
}

/** Map v2 unit symbols to Habity goal_unit. */
export function mapGoalUnit(unit: string): string {
  switch (unit) {
    case 'rep':
      return 'times';
    case 'min':
      return 'min';
    case 'hr':
      return 'hours';
    case 'sec':
      return 'sec';
    case 'ms':
      return 'ms';
    case 'm':
      return 'm';
    case 'kM':
      return 'km';
    case 'ft':
      return 'ft';
    case 'yd':
      return 'yd';
    case 'mi':
      return 'mi';
    case 'kg':
      return 'kg';
    case 'g':
      return 'g';
    case 'mg':
      return 'mg';
    case 'oz':
      return 'oz';
    case 'lb':
      return 'lb';
    case 'L':
      return 'L';
    case 'mL':
      return 'mL';
    case 'fl oz':
      return 'fl oz';
    case 'cup':
      return 'cup';
    case 'kCal':
      return 'kcal';
    case 'cal':
      return 'cal';
    case 'kJ':
      return 'kJ';
    case 'J':
      return 'J';
    case 'step':
      return 'steps';
    case 'floor':
      return 'floors';
    case 'mcg':
      return 'mcg';
    default:
      return unit;
  }
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

// ─── Occurrence → RRULE ───────────────────────────────

const DAY_ABBREVS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Convert a v2 occurrence object to an RRULE string. */
export function occurrenceToRRule(occurrence: HabitifyOccurrence): string | null {
  switch (occurrence.type) {
    case 'daily':
      return 'RRULE:FREQ=DAILY';
    case 'weekDays': {
      const days = occurrence.days
        .map((d) => DAY_ABBREVS[d])
        .filter(Boolean)
        .join(',');
      return days ? `RRULE:FREQ=WEEKLY;BYDAY=${days}` : 'RRULE:FREQ=DAILY';
    }
    case 'intervalDays':
      return `RRULE:FREQ=DAILY;INTERVAL=${occurrence.interval}`;
    default:
      return null;
  }
}

// ─── TimeOfDay mapping ────────────────────────────────

/** Map v2 timeOfDays objects to Habity time_of_day enum values. */
export function mapTimeOfDays(
  timeOfDays: { id: string; name: string }[],
): string[] {
  if (!timeOfDays || timeOfDays.length === 0) {
    return ['anytime'];
  }

  const valid = new Set(['anytime', 'morning', 'afternoon', 'evening', 'night']);
  const result = timeOfDays
    .map((t) => t.name.toLowerCase())
    .filter((name) => valid.has(name));

  return result.length > 0 ? result : ['anytime'];
}
