import { describe, expect, it } from '@jest/globals';

import {
  transformHabit,
  transformDailyProgress,
  findActiveGoal,
  inferTrackingType,
  mapGoal,
  mapGoalUnit,
  mapGoalPeriod,
  occurrenceToRRule,
  mapTimeOfDays,
} from '../transform';
import type { HabitifyHabit, HabitifyGoal, HabitifyDailyProgress } from '../types';

// ─── Helper: minimal v2 habit ─────────────────────────

function makeHabit(overrides: Partial<HabitifyHabit> = {}): HabitifyHabit {
  return {
    id: 'h-1',
    name: 'Morning Run',
    occurrence: { type: 'daily' },
    startDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    isArchived: false,
    logMethod: 'manual',
    goals: [
      {
        id: 'goal-1',
        createdAt: '2024-01-01T00:00:00Z',
        periodicity: 'daily',
        value: 1,
        unit: 'rep',
        isActive: true,
      },
    ],
    areas: [{ id: 'area-1', name: 'Health' }],
    timeOfDays: [{ id: 'tod-1', name: 'Morning' }],
    ...overrides,
  };
}

function makeGoal(overrides: Partial<HabitifyGoal> = {}): HabitifyGoal {
  return {
    id: 'goal-1',
    createdAt: '2024-01-01T00:00:00Z',
    periodicity: 'daily',
    value: 1,
    unit: 'rep',
    isActive: true,
    ...overrides,
  };
}

// ─── transformHabit ───────────────────────────────────

describe('transformHabit', () => {
  it('should transform a basic v2 habit', () => {
    const h = makeHabit();
    const categoryMap = { 'area-1': 'cat-uuid-1' };
    const result = transformHabit(h, 'user-1', categoryMap);

    expect(result.user_id).toBe('user-1');
    expect(result.name).toBe('Morning Run');
    // Default goal is 1 rep — Habitify's checkbox-style habit shape.
    expect(result.tracking_type).toBe('boolean');
    expect(result.goal_value).toBe(1);
    expect(result.goal_unit).toBe('times');
    expect(result.goal_period).toBe('daily');
    expect(result.status).toBe('active');
    expect(result.start_date).toBe('2024-01-01');
    expect(result.external_id).toBe('h-1');
    expect(result.external_source).toBe('habitify');
    expect(result.category_id).toBe('cat-uuid-1');
    expect(result.recurrence_rule).toBe('RRULE:FREQ=DAILY');
    expect(result.time_of_day).toEqual(['morning']);
    expect(result.end_date).toBeNull();
  });

  it('should set status to archived when isArchived is true', () => {
    const result = transformHabit(makeHabit({ isArchived: true }), 'user-1', {});
    expect(result.status).toBe('archived');
  });

  it('should set category_id to null when areas is empty', () => {
    const result = transformHabit(makeHabit({ areas: [] }), 'user-1', {});
    expect(result.category_id).toBeNull();
  });

  it('should use first area for category mapping', () => {
    const h = makeHabit({
      areas: [
        { id: 'area-1', name: 'Health' },
        { id: 'area-2', name: 'Work' },
      ],
    });
    const categoryMap = { 'area-1': 'cat-1', 'area-2': 'cat-2' };
    const result = transformHabit(h, 'user-1', categoryMap);
    expect(result.category_id).toBe('cat-1');
  });

  it('should default time_of_day to ["anytime"] when timeOfDays is empty', () => {
    const result = transformHabit(makeHabit({ timeOfDays: [] }), 'user-1', {});
    expect(result.time_of_day).toEqual(['anytime']);
  });

  it('should use boolean tracking_type when no goals', () => {
    const result = transformHabit(makeHabit({ goals: [] }), 'user-1', {});
    expect(result.tracking_type).toBe('boolean');
    expect(result.goal_value).toBe(1);
    expect(result.goal_unit).toBe('times');
  });

  it('should use duration tracking_type for time-based goals', () => {
    const h = makeHabit({
      goals: [makeGoal({ unit: 'min', value: 30 })],
    });
    const result = transformHabit(h, 'user-1', {});
    expect(result.tracking_type).toBe('duration');
    expect(result.goal_unit).toBe('min');
    expect(result.goal_value).toBe(30);
  });

  it('should use numeric tracking_type for a rep goal with value > 1', () => {
    const h = makeHabit({
      goals: [makeGoal({ unit: 'rep', value: 5 })],
    });
    const result = transformHabit(h, 'user-1', {});
    expect(result.tracking_type).toBe('numeric');
    expect(result.goal_value).toBe(5);
  });

  it('should convert weekDays occurrence to RRULE', () => {
    const h = makeHabit({
      occurrence: { type: 'weekDays', days: [1, 3, 5] },
    });
    const result = transformHabit(h, 'user-1', {});
    expect(result.recurrence_rule).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('should convert intervalDays occurrence to RRULE', () => {
    const h = makeHabit({
      occurrence: { type: 'intervalDays', interval: 3 },
    });
    const result = transformHabit(h, 'user-1', {});
    expect(result.recurrence_rule).toBe('RRULE:FREQ=DAILY;INTERVAL=3');
  });

  it('should use description from v2 habit', () => {
    const h = makeHabit({ description: 'Run every morning' });
    const result = transformHabit(h, 'user-1', {});
    expect(result.description).toBe('Run every morning');
  });

  it('should import the habit with null goal fields when periodicity is unmappable', () => {
    const h = makeHabit({
      goals: [makeGoal({ periodicity: 'yearly', value: 5, unit: 'kM' })],
    });
    const result = transformHabit(h, 'user-1', {});
    expect(result.goal_value).toBeNull();
    expect(result.goal_unit).toBeNull();
    expect(result.goal_period).toBeNull();
    // The habit itself is still imported.
    expect(result.name).toBe('Morning Run');
    expect(result.external_id).toBe('h-1');
  });
});

// ─── transformDailyProgress ───────────────────────────

describe('transformDailyProgress', () => {
  it('should transform a completed daily progress', () => {
    const dp: HabitifyDailyProgress = {
      date: '2024-01-15',
      totalLog: 3.5,
      status: 'completed',
    };

    const result = transformDailyProgress(dp, 'habity-h-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe('user-1');
    expect(result!.habit_id).toBe('habity-h-1');
    expect(result!.value).toBe(3.5);
    expect(result!.target_date).toBe('2024-01-15');
    expect(result!.completed_at).toBe('2024-01-15T00:00:00');
    expect(result!.status).toBe('completed');
    expect(result!.external_id).toBeNull();
  });

  it('should transform a skipped daily progress', () => {
    const dp: HabitifyDailyProgress = {
      date: '2024-01-16',
      totalLog: 0,
      status: 'skipped',
    };

    const result = transformDailyProgress(dp, 'habity-h-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.status).toBe('skipped');
    expect(result!.value).toBe(0);
  });

  it('should return null for failed status', () => {
    const dp: HabitifyDailyProgress = {
      date: '2024-01-17',
      totalLog: 0,
      status: 'failed',
    };

    expect(transformDailyProgress(dp, 'habity-h-1', 'user-1')).toBeNull();
  });

  it('should return null for inprogress status', () => {
    const dp: HabitifyDailyProgress = {
      date: '2024-01-18',
      totalLog: 2,
      status: 'inprogress',
    };

    expect(transformDailyProgress(dp, 'habity-h-1', 'user-1')).toBeNull();
  });
});

// ─── findActiveGoal ───────────────────────────────────

describe('findActiveGoal', () => {
  it('should return the active goal', () => {
    const goals = [
      makeGoal({ id: 'g1', isActive: false }),
      makeGoal({ id: 'g2', isActive: true }),
    ];
    expect(findActiveGoal(goals)!.id).toBe('g2');
  });

  it('should fall back to first goal when none active', () => {
    const goals = [
      makeGoal({ id: 'g1', isActive: false }),
      makeGoal({ id: 'g2', isActive: false }),
    ];
    expect(findActiveGoal(goals)!.id).toBe('g1');
  });

  it('should return null for empty goals', () => {
    expect(findActiveGoal([])).toBeNull();
  });
});

// ─── inferTrackingType ────────────────────────────────

describe('inferTrackingType', () => {
  it.each([
    // Duration units always map to 'duration', regardless of goal value.
    { unit: 'min', value: 1, expected: 'duration' },
    { unit: 'min', value: 30, expected: 'duration' },
    { unit: 'hr', value: 1, expected: 'duration' },
    { unit: 'sec', value: 1, expected: 'duration' },
    { unit: 'ms', value: 1, expected: 'duration' },
    // 'rep' + value 1 is Habitify's checkbox ("just do it") shape → boolean.
    { unit: 'rep', value: 1, expected: 'boolean' },
    // 'rep' with any other value is a real numeric goal (e.g. "5 reps").
    { unit: 'rep', value: 2, expected: 'numeric' },
    { unit: 'rep', value: 5, expected: 'numeric' },
    // Non-'rep' units are never treated as boolean, even at value 1.
    { unit: 'step', value: 1, expected: 'numeric' },
    { unit: 'step', value: 100, expected: 'numeric' },
    { unit: 'kM', value: 1, expected: 'numeric' },
    { unit: 'm', value: 1, expected: 'numeric' },
  ])(
    'should infer "$expected" for unit "$unit" and value $value',
    ({ unit, value, expected }) => {
      expect(inferTrackingType(makeGoal({ unit, value }))).toBe(expected);
    },
  );

  it('should return boolean when goal is null', () => {
    expect(inferTrackingType(null)).toBe('boolean');
  });
});

// ─── mapGoal ──────────────────────────────────────────

describe('mapGoal', () => {
  it('should return defaults for null goal', () => {
    const result = mapGoal(null);
    expect(result).toEqual({ value: 1, unit: 'times', period: 'daily' });
  });

  it('should map a v2 goal', () => {
    const result = mapGoal(makeGoal({ value: 5, unit: 'kM', periodicity: 'weekly' }));
    expect(result).toEqual({ value: 5, unit: 'km', period: 'weekly' });
  });

  it('should not adopt the goal (null value/unit/period) when periodicity is unknown', () => {
    const result = mapGoal(makeGoal({ value: 5, unit: 'kM', periodicity: 'yearly' }));
    expect(result).toEqual({ value: null, unit: null, period: null });
  });
});

// ─── mapGoalUnit ──────────────────────────────────────

describe('mapGoalUnit', () => {
  it.each([
    ['rep', 'times'],
    ['min', 'min'],
    ['hr', 'hours'],
    ['sec', 'sec'],
    ['kM', 'km'],
    ['m', 'm'],
    ['step', 'steps'],
    ['floor', 'floors'],
    ['kCal', 'kcal'],
    ['L', 'L'],
    ['mL', 'mL'],
    ['kg', 'kg'],
    ['unknown_unit', 'unknown_unit'],
  ])('should map "%s" to "%s"', (input, expected) => {
    expect(mapGoalUnit(input)).toBe(expected);
  });
});

// ─── mapGoalPeriod ────────────────────────────────────

describe('mapGoalPeriod', () => {
  it.each([
    ['daily', 'daily'],
    ['weekly', 'weekly'],
    ['monthly', 'monthly'],
  ])('should map "%s" to "%s"', (input, expected) => {
    expect(mapGoalPeriod(input)).toBe(expected);
  });

  it.each(['yearly', 'unknown'])(
    'should return null for unmappable periodicity "%s" instead of fabricating "daily"',
    (input) => {
      expect(mapGoalPeriod(input)).toBeNull();
    },
  );
});

// ─── occurrenceToRRule ────────────────────────────────

describe('occurrenceToRRule', () => {
  it('should convert daily to RRULE:FREQ=DAILY', () => {
    expect(occurrenceToRRule({ type: 'daily' })).toBe('RRULE:FREQ=DAILY');
  });

  it('should convert weekDays to RRULE with BYDAY', () => {
    expect(occurrenceToRRule({ type: 'weekDays', days: [0, 1, 6] })).toBe(
      'RRULE:FREQ=WEEKLY;BYDAY=SU,MO,SA',
    );
  });

  it('should convert weekDays [1,3,5] to MO,WE,FR', () => {
    expect(occurrenceToRRule({ type: 'weekDays', days: [1, 3, 5] })).toBe(
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
    );
  });

  it('should convert intervalDays to RRULE with INTERVAL', () => {
    expect(occurrenceToRRule({ type: 'intervalDays', interval: 3 })).toBe(
      'RRULE:FREQ=DAILY;INTERVAL=3',
    );
  });

  it('should handle all 7 days', () => {
    expect(
      occurrenceToRRule({ type: 'weekDays', days: [0, 1, 2, 3, 4, 5, 6] }),
    ).toBe('RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA');
  });

  it('should fall back to RRULE:FREQ=DAILY when weekDays.days has only out-of-range values', () => {
    expect(occurrenceToRRule({ type: 'weekDays', days: [7, -1] })).toBe(
      'RRULE:FREQ=DAILY',
    );
  });

  it('should return null for an unknown occurrence type', () => {
    expect(occurrenceToRRule({ type: 'timesPerWeek', times: 3 })).toBeNull();
  });
});

// ─── mapTimeOfDays ────────────────────────────────────

describe('mapTimeOfDays', () => {
  it('should return ["anytime"] for empty array', () => {
    expect(mapTimeOfDays([])).toEqual(['anytime']);
  });

  it('should map time-of-day names to lowercase', () => {
    expect(
      mapTimeOfDays([
        { id: '1', name: 'Morning' },
        { id: '2', name: 'Evening' },
      ]),
    ).toEqual(['morning', 'evening']);
  });

  it('should filter invalid values', () => {
    expect(
      mapTimeOfDays([
        { id: '1', name: 'Morning' },
        { id: '2', name: 'CustomTime' },
        { id: '3', name: 'Night' },
      ]),
    ).toEqual(['morning', 'night']);
  });

  it('should return ["anytime"] when all values are invalid', () => {
    expect(mapTimeOfDays([{ id: '1', name: 'CustomTime' }])).toEqual([
      'anytime',
    ]);
  });
});
