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

import {useQuery, useQueryClient, useMutation} from '@tanstack/react-query';
import {habitKeys, useHabitsWithLog, useReorderHabits} from '../habits';
import type {Habit} from '@/types/database';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

// テスト用ヘルパー: useQuery に渡された queryFn を取得して実行
function getQueryFn(date?: string) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useHabitsWithLog(date);
  const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
  const opts = call[0] as unknown as {queryFn: () => Promise<unknown>};
  return opts.queryFn;
}

async function executeQueryFn(date?: string) {
  const queryFn = getQueryFn(date);
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
      expect(habitKeys.byDate('2024-01-01')).toEqual(['habits', 'byDate', '2024-01-01']);
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

  describe('useHabitsWithLog', () => {
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
          is_completed: false,
          is_skipped: false,
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
          is_completed: true,
          is_skipped: false,
        }),
      ]);
    });

    it('should mark as completed when log status is completed (boolean simplified)', async () => {
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
          is_completed: true, // simplified: completed status = completed
          is_skipped: false,
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
        is_completed: boolean;
        is_skipped: boolean;
        log_id: string | null;
      }>;
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('habit-1');
      expect(result[0].is_completed).toBe(true);
      expect(result[0].is_skipped).toBe(false);
      expect(result[0].log_id).toBe('log-1');
      expect(result[1].id).toBe('habit-2');
      expect(result[1].is_completed).toBe(false);
      expect(result[1].is_skipped).toBe(false);
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
        is_completed: boolean;
        is_skipped: boolean;
        log_status: string | null;
      }>;
      expect(result[0].is_completed).toBe(false);
      expect(result[0].is_skipped).toBe(true);
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

    describe('recurrence filtering', () => {
      it('should include habits without recurrence rule', async () => {
        const habit = createMockHabit({recurrence_rule: null});
        setupMockChain({data: [habit], error: null}, {data: [], error: null});

        const result = (await executeQueryFn()) as Array<{id: string}>;
        expect(result).toHaveLength(1);
      });

      it('should filter habits by weekly recurrence rule', async () => {
        // 2024-01-01 is Monday
        const habitMonWedFri = createMockHabit({
          id: 'habit-mwf',
          recurrence_rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
          start_date: '2024-01-01',
        });
        const habitTueThu = createMockHabit({
          id: 'habit-tt',
          recurrence_rule: 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH',
          start_date: '2024-01-01',
        });

        setupMockChain(
          {data: [habitMonWedFri, habitTueThu], error: null},
          {data: [], error: null},
        );

        // Monday (2024-01-01) - only MWF habit should show
        const result = (await executeQueryFn('2024-01-01')) as Array<{id: string}>;
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('habit-mwf');
      });

      it('should filter habits by monthly recurrence rule', async () => {
        const habit = createMockHabit({
          id: 'habit-monthly',
          recurrence_rule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15',
          start_date: '2024-01-01',
        });

        setupMockChain(
          {data: [habit], error: null},
          {data: [], error: null},
        );

        // Jan 1st should match
        const result1 = (await executeQueryFn('2024-01-01')) as Array<{id: string}>;
        expect(result1).toHaveLength(1);
      });

      it('should filter habits by interval recurrence rule', async () => {
        const habit = createMockHabit({
          id: 'habit-interval',
          recurrence_rule: 'RRULE:FREQ=DAILY;INTERVAL=3',
          start_date: '2024-01-01',
        });

        setupMockChain(
          {data: [habit], error: null},
          {data: [], error: null},
        );

        // Day 0 (Jan 1) should match
        const result1 = (await executeQueryFn('2024-01-01')) as Array<{id: string}>;
        expect(result1).toHaveLength(1);
      });
    });
  });

  describe('useReorderHabits', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUseMutation = useMutation as any;

    function setupMutationMock() {
      const mockInvalidateQueries = jest.fn();
      mockedUseQueryClient.mockReturnValue({
        invalidateQueries: mockInvalidateQueries,
      } as unknown as ReturnType<typeof useQueryClient>);
      return {mockInvalidateQueries};
    }

    it('should call useMutation with correct mutationFn', () => {
      setupMutationMock();
      mockUseMutation.mockImplementation((opts: unknown) => opts);

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useReorderHabits();
      expect(mockUseMutation).toHaveBeenCalled();
    });

    it('should call supabase.update for each habit', async () => {
      setupMutationMock();

      let capturedMutationFn: (updates: {id: string; sort_order: number}[]) => Promise<void>;
      mockUseMutation.mockImplementation((opts: {mutationFn: typeof capturedMutationFn}) => {
        capturedMutationFn = opts.mutationFn;
        return opts;
      });

      const mockEq = jest.fn<(...args: unknown[]) => Promise<{error: null}>>()
        .mockResolvedValue({error: null});
      const mockUpdate = jest.fn().mockReturnValue({eq: mockEq});
      mockFrom.mockReturnValue({update: mockUpdate});

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useReorderHabits();

      await capturedMutationFn!([
        {id: 'h1', sort_order: 0},
        {id: 'h2', sort_order: 1},
      ]);

      expect(mockFrom).toHaveBeenCalledWith('habits');
      expect(mockUpdate).toHaveBeenCalledWith({sort_order: 0});
      expect(mockUpdate).toHaveBeenCalledWith({sort_order: 1});
      expect(mockEq).toHaveBeenCalledWith('id', 'h1');
      expect(mockEq).toHaveBeenCalledWith('id', 'h2');
    });

    it('should throw when supabase returns an error', async () => {
      setupMutationMock();

      let capturedMutationFn: (updates: {id: string; sort_order: number}[]) => Promise<void>;
      mockUseMutation.mockImplementation((opts: {mutationFn: typeof capturedMutationFn}) => {
        capturedMutationFn = opts.mutationFn;
        return opts;
      });

      const dbError = {message: 'Update failed', code: '500'};
      const mockEq = jest.fn<(...args: unknown[]) => Promise<{error: typeof dbError}>>()
        .mockResolvedValue({error: dbError});
      const mockUpdate = jest.fn().mockReturnValue({eq: mockEq});
      mockFrom.mockReturnValue({update: mockUpdate});

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useReorderHabits();

      await expect(
        capturedMutationFn!([{id: 'h1', sort_order: 0}]),
      ).rejects.toEqual(dbError);
    });

    it('should invalidate habit queries on success', () => {
      const {mockInvalidateQueries} = setupMutationMock();

      let capturedOnSuccess: () => void;
      mockUseMutation.mockImplementation((opts: {onSuccess: () => void}) => {
        capturedOnSuccess = opts.onSuccess;
        return opts;
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useReorderHabits();
      capturedOnSuccess!();

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: habitKeys.all,
      });
    });
  });
});
