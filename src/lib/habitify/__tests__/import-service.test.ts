import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────

const mockGetHabits = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetStatistics = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockFormatDate = jest.fn<(...args: unknown[]) => string>();

jest.mock('../client', () => ({
  getHabits: (...args: unknown[]) => mockGetHabits(...args),
  getStatistics: (...args: unknown[]) => mockGetStatistics(...args),
  formatDate: (...args: unknown[]) => mockFormatDate(...args),
}));

import { runImport, type ImportParams } from '../import-service';
import type { HabitifyHabit, HabitifyStatistics } from '../types';

// ─── Test data ────────────────────────────────────────

const sampleHabitV2: HabitifyHabit = {
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
};

const sampleStatistics: HabitifyStatistics = {
  id: 'h-1',
  name: 'Morning Run',
  type: 'good',
  totalLogs: 2,
  skips: 0,
  fails: 0,
  completions: 2,
  unit: { id: 'u-1', name: 'Repetition', symbol: 'rep' },
  periodicity: 'daily',
  avg: 1,
  dailyProgress: [
    { date: '2024-01-15', totalLog: 1, status: 'completed' },
    { date: '2024-01-16', totalLog: 1, status: 'completed' },
  ],
};

// ─── Tests ────────────────────────────────────────────

describe('runImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDate.mockReturnValue('2024-01-31');
  });

  it('should return empty result when both flags are false', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });

    const mockFrom = jest.fn();
    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: false,
      importLogs: false,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('should return an errors-populated result (not throw) when the API key is invalid', async () => {
    mockGetHabits.mockRejectedValue(new Error('get habits: status 401'));

    const mockFrom = jest.fn();
    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'bad-key',
      importHabits: true,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('get habits: status 401');
    // Should not touch the DB at all when habits can't be fetched.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should surface fetch-level errors from getHabits alongside successfully parsed habits', async () => {
    mockGetHabits.mockResolvedValue({
      habits: [sampleHabitV2],
      errors: ['habit "Bad Habit": Required'],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { upsert: mockUpsertHabit };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: false,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    expect(result.errors).toContain('habit "Bad Habit": Required');
  });

  it('should not throw and should record an error when ensureCategories fails', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: null,
        error: { message: 'categories DB error' },
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { upsert: mockUpsertHabit };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: false,
      userId: 'user-1',
      supabase,
    });

    // Habit import still proceeds (without category) despite categories failing.
    expect(result.habits_imported).toBe(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('categories DB error')]),
    );
  });

  it('should batch upsert habits with categories', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') {
        return { upsert: mockUpsertCategory };
      }
      if (table === 'habits') {
        return { upsert: mockUpsertHabit };
      }
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: false,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toEqual([]);

    // Verify batch category upsert
    expect(mockUpsertCategory).toHaveBeenCalledWith(
      [expect.objectContaining({ user_id: 'user-1', name: 'Health' })],
      { onConflict: 'user_id,name' },
    );

    // Verify batch habit upsert
    expect(mockUpsertHabit).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          name: 'Morning Run',
          external_id: 'h-1',
          external_source: 'habitify',
          category_id: 'cat-uuid-1',
          recurrence_rule: 'RRULE:FREQ=DAILY',
        }),
      ],
      { onConflict: 'user_id,external_id' },
    );
  });

  it('should batch upsert logs from statistics dailyProgress', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });
    mockGetStatistics.mockResolvedValue(sampleStatistics);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertLog = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      error: null,
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') {
        return { upsert: mockUpsertCategory };
      }
      if (table === 'habits') {
        return { upsert: mockUpsertHabit };
      }
      if (table === 'habit_logs') {
        return { upsert: mockUpsertLog };
      }
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    expect(result.logs_imported).toBe(2);
    expect(result.errors).toEqual([]);

    // Verify logs were created from dailyProgress
    expect(mockUpsertLog).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          habit_id: 'habity-h-1',
          value: 1,
          target_date: '2024-01-15',
          status: 'completed',
          external_id: null,
        }),
        expect.objectContaining({
          target_date: '2024-01-16',
        }),
      ],
      { onConflict: 'habit_id,target_date', ignoreDuplicates: true },
    );
  });

  it('should skip failed and inprogress entries from dailyProgress', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });
    mockGetStatistics.mockResolvedValue({
      ...sampleStatistics,
      dailyProgress: [
        { date: '2024-01-15', totalLog: 1, status: 'completed' },
        { date: '2024-01-16', totalLog: 0, status: 'failed' },
        { date: '2024-01-17', totalLog: 0, status: 'inprogress' },
        { date: '2024-01-18', totalLog: 0, status: 'skipped' },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertLog = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      error: null,
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { upsert: mockUpsertHabit };
      if (table === 'habit_logs') return { upsert: mockUpsertLog };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    // Only completed + skipped = 2 logs
    expect(result.logs_imported).toBe(2);

    expect(mockUpsertLog).toHaveBeenCalledWith(
      [
        expect.objectContaining({ target_date: '2024-01-15', status: 'completed' }),
        expect.objectContaining({ target_date: '2024-01-18', status: 'skipped' }),
      ],
      expect.anything(),
    );
  });

  it('should handle habit without areas (no category)', async () => {
    const habitNoArea: HabitifyHabit = {
      ...sampleHabitV2,
      areas: [],
    };
    mockGetHabits.mockResolvedValue({ habits: [habitNoArea], errors: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'habits') {
        return { upsert: mockUpsertHabit };
      }
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: false,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    // categories table should never be called
    expect(mockFrom).not.toHaveBeenCalledWith('categories');
  });

  it('should report batch habit upsert errors', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      }),
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { upsert: mockUpsertHabit };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: false,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('DB error');
  });

  it('should continue on statistics fetch errors', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });
    mockGetStatistics.mockRejectedValue(new Error('API timeout'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { upsert: mockUpsertHabit };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Morning Run');
    expect(result.errors[0]).toContain('API timeout');
  });

  it('should build habit ID map from existing habits when not importing habits', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });
    mockGetStatistics.mockResolvedValue(sampleStatistics);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockEq = jest.fn<any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eq: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'existing-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSelectFind = jest.fn<any>().mockReturnValue({ eq: mockEq });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertLog = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      error: null,
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { select: mockSelectFind };
      if (table === 'habit_logs') return { upsert: mockUpsertLog };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: false,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.logs_imported).toBe(2);

    // Verify logs were linked to existing habit
    expect(mockUpsertLog).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ habit_id: 'existing-h-1' }),
      ]),
      expect.anything(),
    );
  });

  it('should import zero logs without errors when dailyProgress is empty', async () => {
    mockGetHabits.mockResolvedValue({ habits: [sampleHabitV2], errors: [] });
    mockGetStatistics.mockResolvedValue({
      ...sampleStatistics,
      totalLogs: 0,
      completions: 0,
      dailyProgress: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'cat-uuid-1', name: 'Health' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>().mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: jest.fn<any>().mockResolvedValue({
        data: [{ id: 'habity-h-1', external_id: 'h-1' }],
        error: null,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertLog = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      error: null,
    });

    const mockFrom = jest.fn((table: string) => {
      if (table === 'categories') return { upsert: mockUpsertCategory };
      if (table === 'habits') return { upsert: mockUpsertHabit };
      if (table === 'habit_logs') return { upsert: mockUpsertLog };
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toEqual([]);
    // No log upsert should happen when there are no rows.
    expect(mockUpsertLog).not.toHaveBeenCalled();
  });

  it('should complete without errors or DB writes when there are no habits at all', async () => {
    mockGetHabits.mockResolvedValue({ habits: [], errors: [] });

    const mockFrom = jest.fn();
    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: true,
      importLogs: true,
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toEqual([]);
    expect(mockGetStatistics).not.toHaveBeenCalled();
    // No categories/habits/logs writes for an account with zero habits.
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
