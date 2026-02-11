import {describe, expect, it, jest, beforeEach} from '@jest/globals';

// Supabase モック
const mockFrom = jest.fn();
const mockGetUser = jest.fn<() => Promise<{data: {user: {id: string} | null}}>>()
  .mockResolvedValue({data: {user: {id: 'user-1'}}});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

const mockInvalidateQueries = jest.fn<() => void>();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(
    (opts: {queryFn: () => Promise<unknown>}) => opts,
  ),
  useMutation: jest.fn(
    (opts: {mutationFn: (...args: unknown[]) => Promise<unknown>}) => opts,
  ),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock('../habits', () => ({
  habitKeys: {
    all: ['habits'],
    today: () => ['habits', 'today'],
  },
}));

import {useMutation} from '@tanstack/react-query';
import {useSkipHabitLog, useUnskipHabitLog} from '../habit-logs';

const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('habit-logs queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({data: {user: {id: 'user-1'}}});
  });

  describe('useSkipHabitLog', () => {
    function getSkipMutationFn() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useSkipHabitLog();
      const call = mockedUseMutation.mock.calls[mockedUseMutation.mock.calls.length - 1];
      const opts = call[0] as unknown as {
        mutationFn: (args: {
          habitId: string;
          targetDate: string;
          currentLogId?: string | null;
        }) => Promise<unknown>;
      };
      return opts.mutationFn;
    }

    it('should create a new skipped log when no currentLogId', async () => {
      const mockInsertResult = {
        id: 'log-1',
        habit_id: 'habit-1',
        target_date: '2024-01-01',
        value: 0,
        status: 'skipped',
      };

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn<() => Promise<unknown>>().mockResolvedValue({
              data: mockInsertResult,
              error: null,
            }),
          }),
        }),
      });

      const mutationFn = getSkipMutationFn();
      const result = await mutationFn({
        habitId: 'habit-1',
        targetDate: '2024-01-01',
      });

      expect(result).toEqual(mockInsertResult);
      expect(mockFrom).toHaveBeenCalledWith('habit_logs');
    });

    it('should update existing log to skipped when currentLogId is provided', async () => {
      const mockUpdateResult = {
        id: 'log-1',
        habit_id: 'habit-1',
        target_date: '2024-01-01',
        value: 0,
        status: 'skipped',
      };

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn<() => Promise<unknown>>().mockResolvedValue({
                data: mockUpdateResult,
                error: null,
              }),
            }),
          }),
        }),
      });

      const mutationFn = getSkipMutationFn();
      const result = await mutationFn({
        habitId: 'habit-1',
        targetDate: '2024-01-01',
        currentLogId: 'log-1',
      });

      expect(result).toEqual(mockUpdateResult);
    });

    it('should throw when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({data: {user: null}});

      const mutationFn = getSkipMutationFn();
      await expect(
        mutationFn({
          habitId: 'habit-1',
          targetDate: '2024-01-01',
        }),
      ).rejects.toThrow('認証が必要です');
    });
  });

  describe('useUnskipHabitLog', () => {
    function getUnskipMutationFn() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useUnskipHabitLog();
      const call = mockedUseMutation.mock.calls[mockedUseMutation.mock.calls.length - 1];
      const opts = call[0] as unknown as {
        mutationFn: (logId: string) => Promise<unknown>;
      };
      return opts.mutationFn;
    }

    it('should delete the skipped log', async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn<() => Promise<unknown>>().mockResolvedValue({error: null}),
        }),
      });

      const mutationFn = getUnskipMutationFn();
      await mutationFn('log-1');

      expect(mockFrom).toHaveBeenCalledWith('habit_logs');
    });

    it('should throw when delete fails', async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            error: {message: 'Delete error', code: '500'},
          }),
        }),
      });

      const mutationFn = getUnskipMutationFn();
      await expect(mutationFn('log-1')).rejects.toEqual({
        message: 'Delete error',
        code: '500',
      });
    });
  });
});
