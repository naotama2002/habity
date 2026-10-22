import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Supabase モック
const mockGetSession = jest.fn<() => Promise<unknown>>();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// runImport モック
const mockRunImport = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('@/lib/habitify/import-service', () => ({
  runImport: (...args: unknown[]) => mockRunImport(...args),
}));

import { importFromHabitify } from '../backend-api';

describe('importFromHabitify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' }, access_token: 'token' } },
    });
  });

  it('should call runImport with correct parameters', async () => {
    mockRunImport.mockResolvedValue({
      habits_imported: 5,
      logs_imported: 100,
      errors: [],
    });

    const result = await importFromHabitify({
      api_key: 'habitify-api-key',
      import_habits: true,
      import_logs: true,
    });

    expect(mockRunImport).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'habitify-api-key',
        importHabits: true,
        importLogs: true,
        userId: 'user-123',
      }),
    );

    expect(result).toEqual({
      status: 'completed',
      habits_imported: 5,
      logs_imported: 100,
      errors: undefined,
    });
  });

  it('should include errors when present', async () => {
    mockRunImport.mockResolvedValue({
      habits_imported: 3,
      logs_imported: 50,
      errors: ['habit "X": DB error'],
    });

    const result = await importFromHabitify({
      api_key: 'key',
      import_habits: true,
      import_logs: true,
    });

    expect(result.errors).toEqual(['habit "X": DB error']);
  });

  it('should throw when not authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    await expect(
      importFromHabitify({
        api_key: 'key',
        import_habits: true,
        import_logs: true,
      }),
    ).rejects.toThrow('Not authenticated');
  });

  it('should propagate runImport errors', async () => {
    mockRunImport.mockRejectedValue(
      new Error('get habits: status 401'),
    );

    await expect(
      importFromHabitify({
        api_key: 'bad-key',
        import_habits: true,
        import_logs: true,
      }),
    ).rejects.toThrow('get habits: status 401');
  });
});
