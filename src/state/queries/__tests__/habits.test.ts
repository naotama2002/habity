import {describe, expect, it, jest, beforeEach} from '@jest/globals';

// Supabase モック
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// React Query モック
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(
    (opts: {queryFn: () => Promise<unknown>}) => opts,
  ),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

import {useQuery} from '@tanstack/react-query';
import {habitKeys, useHabitsWithTodayLog} from '../habits';
import type {Habit} from '@/types/database';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// テスト用ヘルパー: useQuery に渡された queryFn を取得して実行
function getQueryFn() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useHabitsWithTodayLog();
  const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
  const opts = call[0] as unknown as {queryFn: () => Promise<unknown>};
  return opts.queryFn;
}

async function executeQueryFn() {
  const queryFn = getQueryFn();
  return queryFn();
}

function createMockHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    user_id: 'user-1',
    name: 'Test Habit',
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
    ...overrides,
  };
}

describe('habits queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('habitKeys', () => {
    it('should generate correct query keys', () => {
      expect(habitKeys.all).toEqual(['habits']);
      expect(habitKeys.today()).toEqual(['habits', 'today']);
      expect(habitKeys.lists()).toEqual(['habits', 'list']);
      expect(habitKeys.list({status: 'active'})).toEqual([
        'habits',
        'list',
        {status: 'active'},
      ]);
      expect(habitKeys.details()).toEqual(['habits', 'detail']);
      expect(habitKeys.detail('123')).toEqual(['habits', 'detail', '123']);
    });
  });

  describe('useHabitsWithTodayLog', () => {
    function setupMockChain(habitsResponse: unknown, logsResponse?: unknown) {
      mockFrom.mockImplementation((...args: unknown[]) => {
        const table = args[0] as string;
        if (table === 'habits') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn<() => Promise<unknown>>()
                  .mockResolvedValue(habitsResponse),
              }),
            }),
          };
        }
        if (table === 'habit_logs') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest
                  .fn<() => Promise<unknown>>()
                  .mockResolvedValue(
                    logsResponse ?? {data: [], error: null},
                  ),
              }),
            }),
          };
        }
        return {};
      });
    }

    it('should return empty array when no habits exist', async () => {
      setupMockChain({data: [], error: null});

      const result = await executeQueryFn();
      expect(result).toEqual([]);
    });

    it('should return habits with null log fields when no logs exist', async () => {
      const habit = createMockHabit();
      setupMockChain({data: [habit], error: null}, {data: [], error: null});

      const result = await executeQueryFn();
      expect(result).toEqual([
        expect.objectContaining({
          id: 'habit-1',
          log_id: null,
          log_value: null,
          log_completed_at: null,
          log_note: null,
          log_status: null,
          is_completed_today: false,
          is_skipped_today: false,
        }),
      ]);
    });

    it('should join logs with habits correctly', async () => {
      const habit = createMockHabit({id: 'habit-1', goal_value: 1});
      const log = {
        id: 'log-1',
        habit_id: 'habit-1',
        value: 1,
        status: 'completed',
        completed_at: '2024-01-01T10:00:00Z',
        note: 'Done!',
        target_date: '2024-01-01',
      };

      setupMockChain({data: [habit], error: null}, {data: [log], error: null});

      const result = await executeQueryFn();
      expect(result).toEqual([
        expect.objectContaining({
          id: 'habit-1',
          log_id: 'log-1',
          log_value: 1,
          log_completed_at: '2024-01-01T10:00:00Z',
          log_note: 'Done!',
          log_status: 'completed',
          is_completed_today: true,
          is_skipped_today: false,
        }),
      ]);
    });

    it('should mark as not completed when log value < goal_value', async () => {
      const habit = createMockHabit({id: 'habit-1', goal_value: 5});
      const log = {
        id: 'log-1',
        habit_id: 'habit-1',
        value: 3,
        status: 'completed',
        completed_at: '2024-01-01T10:00:00Z',
        note: null,
        target_date: '2024-01-01',
      };

      setupMockChain({data: [habit], error: null}, {data: [log], error: null});

      const result = await executeQueryFn();
      expect(result).toEqual([
        expect.objectContaining({
          id: 'habit-1',
          log_value: 3,
          is_completed_today: false,
          is_skipped_today: false,
        }),
      ]);
    });

    it('should handle multiple habits with mixed log status', async () => {
      const habit1 = createMockHabit({
        id: 'habit-1',
        goal_value: 1,
        sort_order: 0,
      });
      const habit2 = createMockHabit({
        id: 'habit-2',
        goal_value: 1,
        sort_order: 1,
      });
      const log = {
        id: 'log-1',
        habit_id: 'habit-1',
        value: 1,
        status: 'completed',
        completed_at: '2024-01-01T10:00:00Z',
        note: null,
        target_date: '2024-01-01',
      };

      setupMockChain(
        {data: [habit1, habit2], error: null},
        {data: [log], error: null},
      );

      const result = (await executeQueryFn()) as Array<{
        id: string;
        is_completed_today: boolean;
        is_skipped_today: boolean;
        log_id: string | null;
      }>;
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('habit-1');
      expect(result[0].is_completed_today).toBe(true);
      expect(result[0].is_skipped_today).toBe(false);
      expect(result[0].log_id).toBe('log-1');
      expect(result[1].id).toBe('habit-2');
      expect(result[1].is_completed_today).toBe(false);
      expect(result[1].is_skipped_today).toBe(false);
      expect(result[1].log_id).toBeNull();
    });

    it('should mark habit as skipped when log status is skipped', async () => {
      const habit = createMockHabit({id: 'habit-1', goal_value: 1});
      const log = {
        id: 'log-1',
        habit_id: 'habit-1',
        value: 0,
        status: 'skipped',
        completed_at: '2024-01-01T10:00:00Z',
        note: null,
        target_date: '2024-01-01',
      };

      setupMockChain({data: [habit], error: null}, {data: [log], error: null});

      const result = (await executeQueryFn()) as Array<{
        id: string;
        is_completed_today: boolean;
        is_skipped_today: boolean;
        log_status: string | null;
      }>;
      expect(result[0].is_completed_today).toBe(false);
      expect(result[0].is_skipped_today).toBe(true);
      expect(result[0].log_status).toBe('skipped');
    });

    it('should throw when habits query fails', async () => {
      setupMockChain({
        data: null,
        error: {message: 'DB error', code: '500'},
      });

      await expect(executeQueryFn()).rejects.toEqual({
        message: 'DB error',
        code: '500',
      });
    });

    it('should throw when habit_logs query fails', async () => {
      const habit = createMockHabit();
      setupMockChain({data: [habit], error: null}, {
        data: null,
        error: {message: 'Logs error', code: '500'},
      });

      await expect(executeQueryFn()).rejects.toEqual({
        message: 'Logs error',
        code: '500',
      });
    });

    it('should return null data when habits is null', async () => {
      setupMockChain({data: null, error: null});

      const result = await executeQueryFn();
      expect(result).toEqual([]);
    });

    it('should query habits table directly (not the view)', async () => {
      setupMockChain({data: [], error: null});

      await executeQueryFn();

      expect(mockFrom).toHaveBeenCalledWith('habits');
      expect(mockFrom).not.toHaveBeenCalledWith('habits_with_today_log');
    });
  });
});
