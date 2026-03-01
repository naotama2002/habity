import { describe, expect, it } from '@jest/globals';

import {
  transformHabit,
  transformLog,
  mapLogMethod,
  mapGoal,
  mapGoalUnit,
  mapGoalPeriod,
  mapTimeOfDay,
  safePriorityToInt,
} from '../transform';
import type { HabitifyHabit, HabitifyLog } from '../types';

// ─── transformHabit ───────────────────────────────────

describe('transformHabit', () => {
  it('should transform a basic check habit', () => {
    const h: HabitifyHabit = {
      id: 'h-1',
      name: 'Morning Run',
      is_archived: false,
      start_date: '2024-01-01T00:00:00+00:00',
      time_of_day: ['morning'],
      log_method: 'check',
      priority: 2,
      recurrence: 'RRULE:FREQ=DAILY',
      goal: { unit_type: 'count', value: 1, periodicity: 'daily' },
      area: { id: 'area-1', name: 'Health' },
      created_date: '2024-01-01T00:00:00+00:00',
    };

    const categoryMap = { 'area-1': 'cat-uuid-1' };
    const result = transformHabit(h, 'user-1', categoryMap);

    expect(result.user_id).toBe('user-1');
    expect(result.name).toBe('Morning Run');
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
    expect(result.sort_order).toBe(2);
  });

  it('should set status to archived when is_archived is true', () => {
    const h: HabitifyHabit = {
      id: 'h-2',
      name: 'Old Habit',
      is_archived: true,
      start_date: '2024-01-01T00:00:00+00:00',
      time_of_day: [],
      log_method: 'check',
      priority: 0,
      recurrence: '',
      goal: null,
      area: null,
      created_date: '2024-01-01T00:00:00+00:00',
    };

    const result = transformHabit(h, 'user-1', {});
    expect(result.status).toBe('archived');
  });

  it('should set category_id to null when area is null', () => {
    const h: HabitifyHabit = {
      id: 'h-1',
      name: 'Test',
      is_archived: false,
      start_date: '2024-01-01T00:00:00+00:00',
      time_of_day: [],
      log_method: 'check',
      priority: 0,
      recurrence: '',
      goal: null,
      area: null,
      created_date: '2024-01-01T00:00:00+00:00',
    };

    const result = transformHabit(h, 'user-1', {});
    expect(result.category_id).toBeNull();
  });

  it('should default time_of_day to ["anytime"] when empty', () => {
    const h: HabitifyHabit = {
      id: 'h-1',
      name: 'Test',
      is_archived: false,
      start_date: '2024-01-01T00:00:00+00:00',
      time_of_day: [],
      log_method: 'check',
      priority: 0,
      recurrence: '',
      goal: null,
      area: null,
      created_date: '2024-01-01T00:00:00+00:00',
    };

    const result = transformHabit(h, 'user-1', {});
    expect(result.time_of_day).toEqual(['anytime']);
  });

  it('should filter invalid time_of_day values', () => {
    const h: HabitifyHabit = {
      id: 'h-1',
      name: 'Test',
      is_archived: false,
      start_date: '2024-01-01T00:00:00+00:00',
      time_of_day: ['morning', 'invalid_value', 'evening'],
      log_method: 'check',
      priority: 0,
      recurrence: '',
      goal: null,
      area: null,
      created_date: '2024-01-01T00:00:00+00:00',
    };

    const result = transformHabit(h, 'user-1', {});
    expect(result.time_of_day).toEqual(['morning', 'evening']);
  });

  it('should set recurrence_rule to null for empty recurrence', () => {
    const h: HabitifyHabit = {
      id: 'h-1',
      name: 'Test',
      is_archived: false,
      start_date: '2024-01-01T00:00:00+00:00',
      time_of_day: [],
      log_method: 'check',
      priority: 0,
      recurrence: '',
      goal: null,
      area: null,
      created_date: '2024-01-01T00:00:00+00:00',
    };

    const result = transformHabit(h, 'user-1', {});
    expect(result.recurrence_rule).toBeNull();
  });
});

// ─── mapLogMethod ─────────────────────────────────────

describe('mapLogMethod', () => {
  it.each([
    ['check', 'boolean'],
    ['measure', 'numeric'],
    ['number', 'numeric'],
    ['timer', 'duration'],
    ['unknown', 'boolean'],
  ])('should map "%s" to "%s"', (input, expected) => {
    expect(mapLogMethod(input)).toBe(expected);
  });
});

// ─── mapGoal ──────────────────────────────────────────

describe('mapGoal', () => {
  it.each([
    {
      name: 'nil goal defaults',
      goal: null,
      wantValue: 1,
      wantUnit: 'times',
      wantPeriod: 'daily',
    },
    {
      name: 'count daily',
      goal: { unit_type: 'count', value: 5, periodicity: 'daily' },
      wantValue: 5,
      wantUnit: 'times',
      wantPeriod: 'daily',
    },
    {
      name: 'minute weekly',
      goal: { unit_type: 'minute', value: 30, periodicity: 'weekly' },
      wantValue: 30,
      wantUnit: 'min',
      wantPeriod: 'weekly',
    },
    {
      name: 'kilometer monthly',
      goal: { unit_type: 'kilometer', value: 100, periodicity: 'monthly' },
      wantValue: 100,
      wantUnit: 'km',
      wantPeriod: 'monthly',
    },
    {
      name: 'unknown unit type passes through',
      goal: { unit_type: 'custom_unit', value: 10, periodicity: 'daily' },
      wantValue: 10,
      wantUnit: 'custom_unit',
      wantPeriod: 'daily',
    },
  ])('$name', ({ goal, wantValue, wantUnit, wantPeriod }) => {
    const result = mapGoal(goal);
    expect(result.value).toBe(wantValue);
    expect(result.unit).toBe(wantUnit);
    expect(result.period).toBe(wantPeriod);
  });
});

// ─── mapGoalUnit ──────────────────────────────────────

describe('mapGoalUnit', () => {
  it.each([
    ['count', 'times'],
    ['minute', 'min'],
    ['hour', 'hours'],
    ['meter', 'm'],
    ['kilometer', 'km'],
    ['custom_unit', 'custom_unit'],
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
    ['unknown', 'daily'],
  ])('should map "%s" to "%s"', (input, expected) => {
    expect(mapGoalPeriod(input)).toBe(expected);
  });
});

// ─── mapTimeOfDay ─────────────────────────────────────

describe('mapTimeOfDay', () => {
  it('should return ["anytime"] for empty array', () => {
    expect(mapTimeOfDay([])).toEqual(['anytime']);
  });

  it('should filter invalid values', () => {
    expect(mapTimeOfDay(['morning', 'invalid', 'evening'])).toEqual([
      'morning',
      'evening',
    ]);
  });

  it('should return ["anytime"] when all values are invalid', () => {
    expect(mapTimeOfDay(['invalid1', 'invalid2'])).toEqual(['anytime']);
  });

  it('should pass through valid values', () => {
    expect(mapTimeOfDay(['morning', 'afternoon', 'evening', 'night'])).toEqual([
      'morning',
      'afternoon',
      'evening',
      'night',
    ]);
  });
});

// ─── safePriorityToInt ────────────────────────────────

describe('safePriorityToInt', () => {
  it.each([
    { name: 'normal', priority: 5, want: 5 },
    { name: 'zero', priority: 0, want: 0 },
    { name: 'negative normal', priority: -1, want: -1 },
    { name: 'very large', priority: 1e18, want: 0 },
    { name: 'very small', priority: -1e18, want: 0 },
    { name: 'NaN', priority: NaN, want: 0 },
    { name: 'positive Infinity', priority: Infinity, want: 0 },
    { name: 'negative Infinity', priority: -Infinity, want: 0 },
  ])('$name: $priority → $want', ({ priority, want }) => {
    expect(safePriorityToInt(priority)).toBe(want);
  });
});

// ─── transformLog ─────────────────────────────────────

describe('transformLog', () => {
  it('should transform a basic log', () => {
    const l: HabitifyLog = {
      id: 'log-1',
      habit_id: 'h-1',
      value: 1,
      created_date: '2024-01-15T10:30:00+00:00',
      unit_type: 'count',
    };

    const result = transformLog(l, 'habity-habit-1', 'user-1', 'UTC');

    expect(result.user_id).toBe('user-1');
    expect(result.habit_id).toBe('habity-habit-1');
    expect(result.value).toBe(1);
    expect(result.target_date).toBe('2024-01-15');
    expect(result.status).toBe('completed');
    expect(result.external_id).toBe('log-1');
    expect(result.completed_at).toBe('2024-01-15T10:30:00+00:00');
  });

  describe('timezone conversion', () => {
    it.each([
      {
        name: 'UTC midnight stays same date in UTC',
        utcTime: '2026-02-10T00:00:00+00:00',
        timezone: 'UTC',
        wantDate: '2026-02-10',
      },
      {
        name: 'UTC 23:00 becomes next day in JST',
        utcTime: '2026-02-09T23:00:00+00:00',
        timezone: 'Asia/Tokyo',
        wantDate: '2026-02-10',
      },
      {
        name: 'UTC 14:00 stays same day in JST (23:00 JST)',
        utcTime: '2026-02-10T14:00:00+00:00',
        timezone: 'Asia/Tokyo',
        wantDate: '2026-02-10',
      },
      {
        name: 'UTC 15:00 becomes next day in JST (00:00 JST)',
        utcTime: '2026-02-10T15:00:00+00:00',
        timezone: 'Asia/Tokyo',
        wantDate: '2026-02-11',
      },
    ])('$name', ({ utcTime, timezone, wantDate }) => {
      const l: HabitifyLog = {
        id: 'log-1',
        habit_id: 'h-1',
        value: 1,
        created_date: utcTime,
        unit_type: 'count',
      };

      const result = transformLog(l, 'habity-habit-1', 'user-1', timezone);
      expect(result.target_date).toBe(wantDate);
    });
  });
});
