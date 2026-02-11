import {describe, expect, it} from '@jest/globals';
import {calculateProgress, sortByCompletion} from '../progress';
import type {HabitWithLog} from '@/types/database';

function createHabit(
  overrides: Partial<HabitWithLog> = {},
): HabitWithLog {
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
    is_completed: false,
    is_skipped: false,
    ...overrides,
  };
}

describe('calculateProgress', () => {
  it('should return zero progress for empty habits', () => {
    const result = calculateProgress([]);
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
      createHabit({id: '1', is_completed: true}),
      createHabit({id: '2', is_completed: false}),
      createHabit({id: '3', is_completed: true}),
    ];
    const result = calculateProgress(habits);
    expect(result.completedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.skippedCount).toBe(0);
    expect(result.effectiveTotal).toBe(3);
    expect(result.percentage).toBeCloseTo(66.67, 1);
  });

  it('should exclude skipped habits from denominator', () => {
    const habits = [
      createHabit({id: '1', is_completed: true}),
      createHabit({id: '2', is_skipped: true}),
      createHabit({id: '3', is_completed: false}),
    ];
    const result = calculateProgress(habits);
    expect(result.completedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.totalCount).toBe(3);
    expect(result.effectiveTotal).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it('should return 0% when all habits are skipped', () => {
    const habits = [
      createHabit({id: '1', is_skipped: true}),
      createHabit({id: '2', is_skipped: true}),
    ];
    const result = calculateProgress(habits);
    expect(result.completedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.effectiveTotal).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('should return 100% when all non-skipped habits are completed', () => {
    const habits = [
      createHabit({id: '1', is_completed: true}),
      createHabit({id: '2', is_completed: true}),
      createHabit({id: '3', is_skipped: true}),
    ];
    const result = calculateProgress(habits);
    expect(result.completedCount).toBe(2);
    expect(result.effectiveTotal).toBe(2);
    expect(result.percentage).toBe(100);
  });
});

describe('sortByCompletion', () => {
  it('should place incomplete habits before completed ones', () => {
    const habits = [
      createHabit({id: '1', is_completed: true, sort_order: 0}),
      createHabit({id: '2', is_completed: false, sort_order: 1}),
      createHabit({id: '3', is_completed: false, sort_order: 2}),
    ];
    const sorted = sortByCompletion(habits);
    expect(sorted.map(h => h.id)).toEqual(['2', '3', '1']);
  });

  it('should place incomplete habits before skipped ones', () => {
    const habits = [
      createHabit({id: '1', is_skipped: true, sort_order: 0}),
      createHabit({id: '2', is_completed: false, sort_order: 1}),
    ];
    const sorted = sortByCompletion(habits);
    expect(sorted.map(h => h.id)).toEqual(['2', '1']);
  });

  it('should preserve sort_order within incomplete group', () => {
    const habits = [
      createHabit({id: '1', is_completed: false, sort_order: 0}),
      createHabit({id: '2', is_completed: false, sort_order: 1}),
      createHabit({id: '3', is_completed: false, sort_order: 2}),
    ];
    const sorted = sortByCompletion(habits);
    expect(sorted.map(h => h.id)).toEqual(['1', '2', '3']);
  });

  it('should preserve sort_order within completed group', () => {
    const habits = [
      createHabit({id: '1', is_completed: true, sort_order: 0}),
      createHabit({id: '2', is_skipped: true, sort_order: 1}),
      createHabit({id: '3', is_completed: true, sort_order: 2}),
    ];
    const sorted = sortByCompletion(habits);
    expect(sorted.map(h => h.id)).toEqual(['1', '2', '3']);
  });

  it('should handle mixed completed and skipped in done group', () => {
    const habits = [
      createHabit({id: '1', is_completed: true, sort_order: 0}),
      createHabit({id: '2', is_completed: false, sort_order: 1}),
      createHabit({id: '3', is_skipped: true, sort_order: 2}),
      createHabit({id: '4', is_completed: false, sort_order: 3}),
    ];
    const sorted = sortByCompletion(habits);
    expect(sorted.map(h => h.id)).toEqual(['2', '4', '1', '3']);
  });

  it('should return empty array for empty input', () => {
    expect(sortByCompletion([])).toEqual([]);
  });
});
