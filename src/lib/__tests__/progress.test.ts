import {describe, expect, it} from '@jest/globals';
import {calculateTodayProgress} from '../progress';
import type {HabitWithTodayLog} from '@/types/database';

function createHabit(
  overrides: Partial<HabitWithTodayLog> = {},
): HabitWithTodayLog {
  return {
    id: 'habit-1',
    user_id: 'user-1',
    name: 'Test',
    description: null,
    category_id: null,
    tracking_type: 'boolean',
    goal_value: 1,
    goal_unit: 'times',
    goal_period: 'daily',
    recurrence_rule: null,
    time_of_day: ['anytime'],
    reminder_times: null,
    reminder_enabled: false,
    start_date: '2024-01-01',
    status: 'active',
    sort_order: 0,
    external_id: null,
    external_source: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    log_id: null,
    log_value: null,
    log_completed_at: null,
    log_note: null,
    log_status: null,
    is_completed_today: false,
    is_skipped_today: false,
    ...overrides,
  };
}

describe('calculateTodayProgress', () => {
  it('should return zero progress for empty habits', () => {
    const result = calculateTodayProgress([]);
    expect(result).toEqual({
      completedCount: 0,
      skippedCount: 0,
      totalCount: 0,
      effectiveTotal: 0,
      percentage: 0,
    });
  });

  it('should calculate progress without skips', () => {
    const habits = [
      createHabit({id: '1', is_completed_today: true}),
      createHabit({id: '2', is_completed_today: false}),
      createHabit({id: '3', is_completed_today: true}),
    ];
    const result = calculateTodayProgress(habits);
    expect(result.completedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.skippedCount).toBe(0);
    expect(result.effectiveTotal).toBe(3);
    expect(result.percentage).toBeCloseTo(66.67, 1);
  });

  it('should exclude skipped habits from denominator', () => {
    const habits = [
      createHabit({id: '1', is_completed_today: true}),
      createHabit({id: '2', is_skipped_today: true}),
      createHabit({id: '3', is_completed_today: false}),
    ];
    const result = calculateTodayProgress(habits);
    expect(result.completedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.totalCount).toBe(3);
    expect(result.effectiveTotal).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it('should return 0% when all habits are skipped', () => {
    const habits = [
      createHabit({id: '1', is_skipped_today: true}),
      createHabit({id: '2', is_skipped_today: true}),
    ];
    const result = calculateTodayProgress(habits);
    expect(result.completedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.effectiveTotal).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('should return 100% when all non-skipped habits are completed', () => {
    const habits = [
      createHabit({id: '1', is_completed_today: true}),
      createHabit({id: '2', is_completed_today: true}),
      createHabit({id: '3', is_skipped_today: true}),
    ];
    const result = calculateTodayProgress(habits);
    expect(result.completedCount).toBe(2);
    expect(result.effectiveTotal).toBe(2);
    expect(result.percentage).toBe(100);
  });
});
