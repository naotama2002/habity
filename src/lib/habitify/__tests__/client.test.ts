import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// global fetch モック
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

import { getHabits, getStatistics, validate, formatDate } from '../client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

const sampleHabitV2 = {
  id: 'habit-1',
  name: 'Morning Run',
  icon: null,
  colorHex: '#FF6B6B',
  type: 'good',
  description: null,
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

describe('Habitify API v2 client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHabits', () => {
    it('should fetch habits with X-API-Key header', async () => {
      // First call: active habits, second call: archived habits
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            data: [sampleHabitV2],
            pagination: { total: 1, limit: 100, offset: 0 },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [],
            pagination: { total: 0, limit: 100, offset: 0 },
          }),
        );

      const habits = await getHabits('test-api-key', 'http://localhost:9999');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:9999/habits?'),
        {
          method: 'GET',
          headers: { 'X-API-Key': 'test-api-key' },
        },
      );

      expect(habits).toHaveLength(1);
      expect(habits[0].id).toBe('habit-1');
      expect(habits[0].name).toBe('Morning Run');
      expect(habits[0].isArchived).toBe(false);
      expect(habits[0].areas).toEqual([{ id: 'area-1', name: 'Health' }]);
      expect(habits[0].goals).toHaveLength(1);
    });

    it('should throw on unauthorized response', async () => {
      mockFetch.mockResolvedValue(jsonResponse('', 401));

      await expect(
        getHabits('bad-key', 'http://localhost:9999'),
      ).rejects.toThrow('get habits: status 401');
    });

    it('should handle pagination (multiple pages)', async () => {
      // Page 1 of active habits: 100 items
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        ...sampleHabitV2,
        id: `habit-${i}`,
      }));
      // Page 2 of active habits: 10 items
      const page2 = Array.from({ length: 10 }, (_, i) => ({
        ...sampleHabitV2,
        id: `habit-${100 + i}`,
      }));

      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            data: page1,
            pagination: { total: 110, limit: 100, offset: 0 },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: page2,
            pagination: { total: 110, limit: 100, offset: 100 },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [],
            pagination: { total: 0, limit: 100, offset: 0 },
          }),
        );

      const habits = await getHabits('test-api-key', 'http://localhost:9999');

      expect(habits).toHaveLength(110);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 2 pages active + 1 page archived
    });

    it('should fetch both active and archived habits', async () => {
      const activeHabit = { ...sampleHabitV2, id: 'active-1', isArchived: false };
      const archivedHabit = { ...sampleHabitV2, id: 'archived-1', isArchived: true };

      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            data: [activeHabit],
            pagination: { total: 1, limit: 100, offset: 0 },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [archivedHabit],
            pagination: { total: 1, limit: 100, offset: 0 },
          }),
        );

      const habits = await getHabits('test-api-key', 'http://localhost:9999');

      expect(habits).toHaveLength(2);
      expect(habits[0].id).toBe('active-1');
      expect(habits[1].id).toBe('archived-1');

      // Verify first call is for active, second for archived
      const url1 = (mockFetch.mock.calls[0] as [string])[0];
      const url2 = (mockFetch.mock.calls[1] as [string])[0];
      expect(url1).toContain('archived=false');
      expect(url2).toContain('archived=true');
    });

    it('should throw on malformed habit data (Zod validation)', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          data: [{ is_archived: 'not-a-boolean' }],
          pagination: { total: 1, limit: 100, offset: 0 },
        }),
      );

      await expect(
        getHabits('test-api-key', 'http://localhost:9999'),
      ).rejects.toThrow();
    });
  });

  describe('getStatistics', () => {
    const sampleStats = {
      id: 'habit-1',
      name: 'Morning Run',
      type: 'good',
      totalLogs: 10,
      skips: 2,
      fails: 1,
      completions: 7,
      unit: { id: 'unit-1', name: 'Repetition', symbol: 'rep' },
      periodicity: 'daily',
      avg: 1.5,
      dailyProgress: [
        { date: '2024-01-15', totalLog: 1, status: 'completed' },
        { date: '2024-01-16', totalLog: 0, status: 'skipped' },
      ],
    };

    it('should fetch statistics with correct path', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: sampleStats }));

      const stats = await getStatistics(
        'test-api-key',
        'habit-1',
        '2024-01-01',
        '2024-01-31',
        'http://localhost:9999',
      );

      const calledUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(calledUrl).toContain('/habits/habit-1/statistics');
      expect(calledUrl).toContain('startDate=2024-01-01');
      expect(calledUrl).toContain('endDate=2024-01-31');

      expect(stats.dailyProgress).toHaveLength(2);
      expect(stats.completions).toBe(7);
    });

    it('should work without date parameters', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: sampleStats }));

      await getStatistics('test-api-key', 'habit-1', undefined, undefined, 'http://localhost:9999');

      const calledUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(calledUrl).toBe('http://localhost:9999/habits/habit-1/statistics');
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue(jsonResponse('', 500));

      await expect(
        getStatistics('test-api-key', 'habit-1', undefined, undefined, 'http://localhost:9999'),
      ).rejects.toThrow('get statistics for habit habit-1: status 500');
    });

    it('should throw on malformed statistics data', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ data: { id: 'h-1' } }),
      );

      await expect(
        getStatistics('test-api-key', 'habit-1', undefined, undefined, 'http://localhost:9999'),
      ).rejects.toThrow();
    });
  });

  describe('validate', () => {
    it('should succeed when getHabits succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ data: [], pagination: { total: 0, limit: 100, offset: 0 } }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ data: [], pagination: { total: 0, limit: 100, offset: 0 } }),
        );

      await expect(
        validate('test-api-key', 'http://localhost:9999'),
      ).resolves.toBeUndefined();
    });

    it('should throw when getHabits fails', async () => {
      mockFetch.mockResolvedValue(jsonResponse('', 401));

      await expect(
        validate('bad-key', 'http://localhost:9999'),
      ).rejects.toThrow();
    });
  });

  describe('formatDate', () => {
    it('should format a date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should pad single-digit month and day', () => {
      const date = new Date(2024, 2, 5); // Mar 5, 2024
      expect(formatDate(date)).toBe('2024-03-05');
    });
  });
});
