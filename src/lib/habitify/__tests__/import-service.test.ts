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

// ─── Supabase mock helpers ────────────────────────────

function createMockSupabase() {
  const mockSingle = jest.fn<() => Promise<unknown>>();
  const mockSelect = jest.fn<() => { single: typeof mockSingle }>(() => ({
    single: mockSingle,
  }));
  const mockUpsertResult = jest.fn<() => { select: typeof mockSelect }>(() => ({
    select: mockSelect,
  }));
  const mockUpsertNoReturn = jest.fn<() => Promise<{ error: null }>>(() =>
    Promise.resolve({ error: null }),
  );

  // For findHabitByExternalId
  const mockMaybeSingle = jest.fn<() => Promise<unknown>>();
  const mockEq3 = jest.fn<() => { maybeSingle: typeof mockMaybeSingle }>(() => ({
    maybeSingle: mockMaybeSingle,
  }));
  const mockEq2 = jest.fn<() => { eq: typeof mockEq3 }>(() => ({
    eq: mockEq3,
  }));
  const mockEq1 = jest.fn<() => { eq: typeof mockEq2 }>(() => ({
    eq: mockEq2,
  }));
  const mockSelectFind = jest.fn<() => { eq: typeof mockEq1 }>(() => ({
    eq: mockEq1,
  }));

  const mockFrom = jest.fn<(table: string) => unknown>();

  const supabase = {
    from: mockFrom,
  };

  return {
    supabase: supabase as unknown as ImportParams['supabase'],
    mockFrom,
    mockUpsertResult,
    mockSelect,
    mockSingle,
    mockUpsertNoReturn,
    mockSelectFind,
    mockEq1,
    mockMaybeSingle,
  };
}

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

    const { supabase } = createMockSupabase();

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

    const { supabase } = createMockSupabase();

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

  it('should import habits with categories', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);

    const mockSingleCategory = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'cat-uuid-1' },
      error: null,
    });
    const mockSelectCategory = jest.fn(() => ({
      single: mockSingleCategory,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertCategory = jest.fn<(...args: any[]) => any>(() => ({
      select: mockSelectCategory,
    }));

    const mockSingleHabit = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'habity-h-1' },
      error: null,
    });
    const mockSelectHabit = jest.fn(() => ({
      single: mockSingleHabit,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpsertHabit = jest.fn<(...args: any[]) => any>(() => ({
      select: mockSelectHabit,
    }));

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

    // Verify category upsert was called
    expect(mockFrom).toHaveBeenCalledWith('categories');
    expect(mockUpsertCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'Health',
      }),
      { onConflict: 'user_id,name' },
    );

    // Verify habit upsert was called
    expect(mockFrom).toHaveBeenCalledWith('habits');
    expect(mockUpsertHabit).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'Morning Run',
        external_id: 'h-1',
        external_source: 'habitify',
        category_id: 'cat-uuid-1',
      }),
      { onConflict: 'user_id,external_id' },
    );
  });

  it('should import logs', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);
    mockGetLogs.mockResolvedValue([sampleLog]);

    const mockSingleCategory = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'cat-uuid-1' },
      error: null,
    });
    const mockSelectCategory = jest.fn(() => ({
      single: mockSingleCategory,
    }));
    const mockUpsertCategory = jest.fn(() => ({
      select: mockSelectCategory,
    }));

    const mockSingleHabit = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'habity-h-1' },
      error: null,
    });
    const mockSelectHabit = jest.fn(() => ({
      single: mockSingleHabit,
    }));
    const mockUpsertHabit = jest.fn(() => ({
      select: mockSelectHabit,
    }));

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

    // Verify log upsert was called
    expect(mockUpsertLog).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        habit_id: 'habity-h-1',
        value: 1,
        target_date: '2024-01-15',
        status: 'completed',
        external_id: 'log-1',
      }),
      { onConflict: 'habit_id,target_date', ignoreDuplicates: true },
    );
  });

  it('should continue on individual habit errors', async () => {
    const habit2: HabitifyHabit = {
      ...sampleHabit,
      id: 'h-2',
      name: 'Read',
      area: null,
    };
    mockGetHabits.mockResolvedValue([sampleHabit, habit2]);

    // First category upsert succeeds
    const mockSingleCategory = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'cat-uuid-1' },
      error: null,
    });
    const mockSelectCategory = jest.fn(() => ({
      single: mockSingleCategory,
    }));
    const mockUpsertCategory = jest.fn(() => ({
      select: mockSelectCategory,
    }));

    // First habit fails, second succeeds
    let habitCall = 0;
    const mockSingleHabit = jest.fn<() => Promise<unknown>>(() => {
      habitCall++;
      if (habitCall === 1) {
        return Promise.resolve({ data: null, error: { message: 'DB error' } });
      }
      return Promise.resolve({ data: { id: 'habity-h-2' }, error: null });
    });
    const mockSelectHabit = jest.fn(() => ({
      single: mockSingleHabit,
    }));
    const mockUpsertHabit = jest.fn(() => ({
      select: mockSelectHabit,
    }));

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
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Morning Run');
  });

  it('should handle habit without area (no category)', async () => {
    const habitNoArea: HabitifyHabit = {
      ...sampleHabit,
      area: null,
    };
    mockGetHabits.mockResolvedValue([habitNoArea]);

    const mockSingleHabit = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'habity-h-1' },
      error: null,
    });
    const mockSelectHabit = jest.fn(() => ({
      single: mockSingleHabit,
    }));
    const mockUpsertHabit = jest.fn(() => ({
      select: mockSelectHabit,
    }));

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

  it('should continue on log fetch errors', async () => {
    mockGetHabits.mockResolvedValue([sampleHabit]);
    mockGetLogs.mockRejectedValue(new Error('API timeout'));

    const mockSingleCategory = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'cat-uuid-1' },
      error: null,
    });
    const mockSelectCategory = jest.fn(() => ({
      single: mockSingleCategory,
    }));
    const mockUpsertCategory = jest.fn(() => ({
      select: mockSelectCategory,
    }));

    const mockSingleHabit = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      data: { id: 'habity-h-1' },
      error: null,
    });
    const mockSelectHabit = jest.fn(() => ({
      single: mockSingleHabit,
    }));
    const mockUpsertHabit = jest.fn(() => ({
      select: mockSelectHabit,
    }));

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
});
