import {describe, expect, it, jest, beforeEach} from '@jest/globals';

// Supabase モック — RPC 呼び出し用
const mockRpc = jest.fn<(...args: unknown[]) => Promise<{data: unknown; error: unknown}>>();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
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

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// テスト用ヘルパー: useQuery に渡された queryFn を取得して実行
function getQueryFn(habitIds: string[]) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useHabitStreaks(habitIds);
  const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
  const opts = call[0] as unknown as {queryFn: () => Promise<unknown>};
  return opts.queryFn;
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
    it('should call RPC with habit_ids and today', async () => {
      mockRpc.mockResolvedValue({data: [], error: null});

      const queryFn = getQueryFn(['habit-1']);
      await queryFn();

      expect(mockRpc).toHaveBeenCalledWith('calculate_streaks', {
        p_habit_ids: ['habit-1'],
        p_today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });

    it('should convert RPC results to StreakResult map', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {habit_id: 'habit-1', streak_count: 5, streak_from: '2026-02-17'},
          {habit_id: 'habit-2', streak_count: 1, streak_from: '2026-02-22'},
        ],
        error: null,
      });

      const queryFn = getQueryFn(['habit-1', 'habit-2']);
      const result = await queryFn();

      expect(result).toEqual({
        'habit-1': {count: 5, from: '2026-02-17'},
        'habit-2': {count: 1, from: '2026-02-22'},
      });
    });

    it('should return count=0 for habits not returned by RPC', async () => {
      mockRpc.mockResolvedValue({data: [], error: null});

      const queryFn = getQueryFn(['habit-1']);
      const result = await queryFn();

      expect(result).toEqual({'habit-1': {count: 0, from: null}});
    });

    it('should throw when supabase returns an error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {message: 'DB error', code: '500'},
      });

      const queryFn = getQueryFn(['habit-1']);

      await expect(queryFn()).rejects.toEqual({
        message: 'DB error',
        code: '500',
      });
    });

    it('should be disabled when habitIds is empty', () => {
      mockRpc.mockResolvedValue({data: [], error: null});

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useHabitStreaks([]);

      const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
      const opts = call[0] as unknown as {enabled: boolean};
      expect(opts.enabled).toBe(false);
    });

    it('should have staleTime of 5 minutes', () => {
      mockRpc.mockResolvedValue({data: [], error: null});

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useHabitStreaks(['habit-1']);

      const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
      const opts = call[0] as unknown as {staleTime: number};
      expect(opts.staleTime).toBe(5 * 60 * 1000);
    });

    it('should handle null data from supabase', async () => {
      mockRpc.mockResolvedValue({data: null, error: null});

      const queryFn = getQueryFn(['habit-1']);
      const result = await queryFn();

      expect(result).toEqual({'habit-1': {count: 0, from: null}});
    });
  });
});
