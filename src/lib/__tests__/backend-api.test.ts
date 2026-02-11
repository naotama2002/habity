import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Supabase モック
const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// expo-constants モック（backendUrl を追加）
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'http://localhost:54321',
      supabaseAnonKey: 'test-anon-key',
      backendUrl: 'http://localhost:8080',
    },
  },
}));

// global fetch モック
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

import { importFromHabitify } from '../backend-api';

describe('importFromHabitify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
    });
  });

  it('should call the backend API with correct parameters', async () => {
    const mockResult = {
      status: 'completed',
      habits_imported: 5,
      logs_imported: 100,
      errors: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    } as Response);

    const result = await importFromHabitify({
      api_key: 'habitify-api-key',
      import_habits: true,
      import_logs: true,
      timezone: 'Asia/Tokyo',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/import/habitify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jwt-token',
        },
        body: JSON.stringify({
          api_key: 'habitify-api-key',
          import_habits: true,
          import_logs: true,
          timezone: 'Asia/Tokyo',
        }),
      },
    );

    expect(result).toEqual(mockResult);
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
        timezone: 'Asia/Tokyo',
      }),
    ).rejects.toThrow('Not authenticated');
  });

  it('should throw on API error with error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'Invalid Habitify API key' }),
    } as Response);

    await expect(
      importFromHabitify({
        api_key: 'bad-key',
        import_habits: true,
        import_logs: true,
        timezone: 'Asia/Tokyo',
      }),
    ).rejects.toThrow('Invalid Habitify API key');
  });

  it('should throw on API error without JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as Response);

    await expect(
      importFromHabitify({
        api_key: 'key',
        import_habits: true,
        import_logs: true,
        timezone: 'Asia/Tokyo',
      }),
    ).rejects.toThrow('Import failed with status 500');
  });
});
