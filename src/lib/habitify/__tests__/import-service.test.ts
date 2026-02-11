import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────

const mockGetHabits = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetLogs = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../client', () => ({
  getHabits: (...args: unknown[]) => mockGetHabits(...args),
  getLogs: (...args: unknown[]) => mockGetLogs(...args),
}));

import { runImport, type ImportParams } from '../import-service';
import type { HabitifyHabit, HabitifyLog } from '../types';

// ─── Test data ────────────────────────────────────────

const sampleHabit: HabitifyHabit = {
  id: 'h-1',
  name: 'Morning Run',
  is_archived: false,
  start_date: '2024-01-01T00:00:00+00:00',
  time_of_day: ['morning'],
  area: { id: 'area-1', name: 'Health' },
  recurrence: 'RRULE:FREQ=DAILY',
  goal: { unit_type: 'count', value: 1, periodicity: 'daily' },
  log_method: 'check',
  priority: 1,
  created_date: '2024-01-01T00:00:00+00:00',
};

const sampleLog: HabitifyLog = {
  id: 'log-1',
  habit_id: 'h-1',
  value: 1,
  created_date: '2024-01-15T10:30:00+00:00',
  unit_type: 'count',
};

// ─── Tests ────────────────────────────────────────────

describe('runImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty result when both flags are false', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);

    const mockFrom = jest.fn();
    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: false,
      importLogs: false,
      timezone: 'UTC',
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.logs_imported).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('should throw when API key is invalid', async () => {
    mockGetHabits.mockRejectedValue(new Error('get habits: status 401'));

    const mockFrom = jest.fn();
    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    await expect(
      runImport({
        apiKey: 'bad-key',
        importHabits: true,
        importLogs: true,
        timezone: 'UTC',
        userId: 'user-1',
        supabase,
      }),
    ).rejects.toThrow('get habits: status 401');
  });

  it('should batch upsert habits with categories', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);

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
      timezone: 'UTC',
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
      [expect.objectContaining({
        user_id: 'user-1',
        name: 'Morning Run',
        external_id: 'h-1',
        external_source: 'habitify',
        category_id: 'cat-uuid-1',
      })],
      { onConflict: 'user_id,external_id' },
    );
  });

  it('should batch upsert logs', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);
    mockGetLogs.mockResolvedValue([sampleLog]);

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
      timezone: 'UTC',
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    expect(result.logs_imported).toBe(1);
    expect(result.errors).toEqual([]);

    // Verify batch log upsert (array)
    expect(mockUpsertLog).toHaveBeenCalledWith(
      [expect.objectContaining({
        user_id: 'user-1',
        habit_id: 'habity-h-1',
        value: 1,
        target_date: '2024-01-15',
        status: 'completed',
        external_id: 'log-1',
      })],
      { onConflict: 'habit_id,target_date', ignoreDuplicates: true },
    );
  });

  it('should handle habit without area (no category)', async () => {
    const habitNoArea: HabitifyHabit = {
      ...sampleHabit,
      area: null,
    };
    mockGetHabits.mockResolvedValue([habitNoArea]);

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
      timezone: 'UTC',
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(1);
    // categories table should never be called
    expect(mockFrom).not.toHaveBeenCalledWith('categories');
  });

  it('should report batch habit upsert errors', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);

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
      timezone: 'UTC',
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('DB error');
  });

  it('should continue on log fetch errors', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);
    mockGetLogs.mockRejectedValue(new Error('API timeout'));

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
      importLogs: true,
      timezone: 'UTC',
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
    mockGetHabits.mockResolvedValue([sampleHabit]);
    mockGetLogs.mockResolvedValue([sampleLog]);

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
      if (table === 'categories') {
        return { upsert: mockUpsertCategory };
      }
      if (table === 'habits') {
        return { select: mockSelectFind };
      }
      if (table === 'habit_logs') {
        return { upsert: mockUpsertLog };
      }
      return {};
    });

    const supabase = { from: mockFrom } as unknown as ImportParams['supabase'];

    const result = await runImport({
      apiKey: 'test-key',
      importHabits: false,
      importLogs: true,
      timezone: 'UTC',
      userId: 'user-1',
      supabase,
    });

    expect(result.habits_imported).toBe(0);
    expect(result.logs_imported).toBe(1);

    // Verify log was linked to existing habit
    expect(mockUpsertLog).toHaveBeenCalledWith(
      [expect.objectContaining({ habit_id: 'existing-h-1' })],
      expect.anything(),
    );
  });
});
