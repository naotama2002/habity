import {describe, expect, it, jest, beforeEach} from '@jest/globals';

// Supabase モック
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// React Query モック
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(
    (opts: {queryFn: () => Promise<unknown>}) => opts,
  ),
}));

import {useQuery} from '@tanstack/react-query';
import {streakKeys, useHabitStreaks} from '../streaks';
import type {StreakHabitInfo} from '@/lib/streak';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// テスト用ヘルパー: useQuery に渡された queryFn を取得して実行
function getQueryFn(
  habitIds: string[],
  habits: Record<string, StreakHabitInfo>,
) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useHabitStreaks(habitIds, habits);
  const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
  const opts = call[0] as unknown as {queryFn: () => Promise<unknown>};
  return opts.queryFn;
}

function setupMockChain(response: unknown) {
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn<() => Promise<unknown>>().mockResolvedValue(response),
        }),
      }),
    }),
  });
}

describe('streaks queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('streakKeys', () => {
    it('should generate correct query keys', () => {
      expect(streakKeys.all).toEqual(['streaks']);
      expect(streakKeys.byHabits(['b', 'a'])).toEqual([
        'streaks',
        'byHabits',
        'a',
        'b',
      ]);
    });

    it('should sort habit IDs for consistent cache keys', () => {
      expect(streakKeys.byHabits(['z', 'a', 'm'])).toEqual([
        'streaks',
        'byHabits',
        'a',
        'm',
        'z',
      ]);
    });
  });

  describe('useHabitStreaks', () => {
    it('should query habit_logs table', async () => {
      setupMockChain({data: [], error: null});

      const habits: Record<string, StreakHabitInfo> = {
        'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
      };
      const queryFn = getQueryFn(['habit-1'], habits);
      await queryFn();

      expect(mockFrom).toHaveBeenCalledWith('habit_logs');
    });

    it('should return streak results for each habit', async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      setupMockChain({
        data: [
          {habit_id: 'habit-1', target_date: today, status: 'completed'},
          {habit_id: 'habit-1', target_date: yesterdayStr, status: 'completed'},
          {habit_id: 'habit-2', target_date: today, status: 'completed'},
        ],
        error: null,
      });

      const habits: Record<string, StreakHabitInfo> = {
        'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
        'habit-2': {recurrence_rule: null, start_date: '2024-01-01'},
      };
      const queryFn = getQueryFn(['habit-1', 'habit-2'], habits);
      const result = await queryFn();

      expect(result).toEqual({
        'habit-1': {count: 2, from: yesterdayStr},
        'habit-2': {count: 1, from: today},
      });
    });

    it('should return count=0 for habits with no logs', async () => {
      setupMockChain({data: [], error: null});

      const habits: Record<string, StreakHabitInfo> = {
        'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
      };
      const queryFn = getQueryFn(['habit-1'], habits);
      const result = await queryFn();

      expect(result).toEqual({'habit-1': {count: 0, from: null}});
    });

    it('should throw when supabase returns an error', async () => {
      setupMockChain({
        data: null,
        error: {message: 'DB error', code: '500'},
      });

      const habits: Record<string, StreakHabitInfo> = {
        'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
      };
      const queryFn = getQueryFn(['habit-1'], habits);

      await expect(queryFn()).rejects.toEqual({
        message: 'DB error',
        code: '500',
      });
    });

    it('should be disabled when habitIds is empty', () => {
      setupMockChain({data: [], error: null});

      const habits: Record<string, StreakHabitInfo> = {};
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useHabitStreaks([], habits);

      const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
      const opts = call[0] as unknown as {enabled: boolean};
      expect(opts.enabled).toBe(false);
    });

    it('should have staleTime of 5 minutes', () => {
      setupMockChain({data: [], error: null});

      const habits: Record<string, StreakHabitInfo> = {
        'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
      };
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useHabitStreaks(['habit-1'], habits);

      const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
      const opts = call[0] as unknown as {staleTime: number};
      expect(opts.staleTime).toBe(5 * 60 * 1000);
    });

    it('should handle null data from supabase', async () => {
      setupMockChain({data: null, error: null});

      const habits: Record<string, StreakHabitInfo> = {
        'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
      };
      const queryFn = getQueryFn(['habit-1'], habits);
      const result = await queryFn();

      expect(result).toEqual({'habit-1': {count: 0, from: null}});
    });
  });
});
