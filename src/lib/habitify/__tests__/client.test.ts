import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// global fetch モック
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

import { getHabits, getLogs, validate, formatHabitifyDate } from '../client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('Habitify API client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHabits', () => {
    it('should fetch habits with correct auth header', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          message: 'OK',
          data: [
            {
              id: 'habit-1',
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
            },
          ],
          status: true,
          version: 'v1.2',
        }),
      );

      const habits = await getHabits('test-api-key', 'http://localhost:9999');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9999/habits', {
        method: 'GET',
        headers: { Authorization: 'test-api-key' },
      });

      expect(habits).toHaveLength(1);
      expect(habits[0].id).toBe('habit-1');
      expect(habits[0].name).toBe('Morning Run');
      expect(habits[0].is_archived).toBe(false);
      expect(habits[0].area).toEqual({ id: 'area-1', name: 'Health' });
      expect(habits[0].goal).toEqual({
        unit_type: 'count',
        value: 1,
        periodicity: 'daily',
      });
      expect(habits[0].log_method).toBe('check');
    });

    it('should throw on unauthorized response', async () => {
      mockFetch.mockResolvedValue(jsonResponse('', 401));

      await expect(
        getHabits('bad-key', 'http://localhost:9999'),
      ).rejects.toThrow('get habits: status 401');
    });

    it('should handle null area and null goal', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          message: 'OK',
          data: [
            {
              id: 'habit-1',
              name: 'Read',
              is_archived: false,
              start_date: '2024-01-01T00:00:00+00:00',
              time_of_day: [],
              area: null,
              recurrence: 'RRULE:FREQ=DAILY',
              goal: null,
              log_method: 'check',
              priority: 0,
              created_date: '2024-01-01T00:00:00+00:00',
            },
          ],
          status: true,
          version: 'v1.2',
        }),
      );

      const habits = await getHabits('test-api-key', 'http://localhost:9999');

      expect(habits).toHaveLength(1);
      expect(habits[0].area).toBeNull();
      expect(habits[0].goal).toBeNull();
    });

    it('should throw on API error (status false)', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          message: 'Invalid API key',
          data: null,
          status: false,
          version: 'v1.2',
        }),
      );

      await expect(
        getHabits('test-api-key', 'http://localhost:9999'),
      ).rejects.toThrow('get habits: API returned error: Invalid API key');
    });
  });

  describe('getLogs', () => {
    it('should fetch logs with correct path and query parameters', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          message: 'OK',
          data: [
            {
              id: 'log-1',
              habit_id: 'habit-1',
              value: 1,
              created_date: '2024-01-15T10:30:00+00:00',
              unit_type: 'count',
            },
            {
              id: 'log-2',
              habit_id: 'habit-1',
              value: 2.5,
              created_date: '2024-01-16T08:00:00+00:00',
              unit_type: 'count',
            },
          ],
          status: true,
          version: 'v1.2',
        }),
      );

      const from = new Date('2024-01-01T00:00:00Z');
      const to = new Date('2024-01-31T00:00:00Z');

      const logs = await getLogs(
        'test-api-key',
        'habit-1',
        from,
        to,
        'http://localhost:9999',
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(calledUrl).toContain('http://localhost:9999/logs/habit-1?');
      expect(calledUrl).toContain('from=');
      expect(calledUrl).toContain('to=');

      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe('log-1');
      expect(logs[0].value).toBe(1);
      expect(logs[1].value).toBe(2.5);
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue(jsonResponse('', 500));

      await expect(
        getLogs(
          'test-api-key',
          'habit-1',
          new Date(),
          new Date(),
          'http://localhost:9999',
        ),
      ).rejects.toThrow('get logs for habit habit-1: status 500');
    });

    it('should throw on API error (status false)', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          message: 'Not found',
          data: null,
          status: false,
          version: 'v1.2',
        }),
      );

      await expect(
        getLogs(
          'test-api-key',
          'habit-1',
          new Date(),
          new Date(),
          'http://localhost:9999',
        ),
      ).rejects.toThrow(
        'get logs for habit habit-1: API returned error: Not found',
      );
    });
  });

  describe('validate', () => {
    it('should succeed when getHabits succeeds', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          message: 'OK',
          data: [],
          status: true,
          version: 'v1.2',
        }),
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

  describe('formatHabitifyDate', () => {
    it('should format a UTC date with +00:00 offset (not Z)', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatHabitifyDate(date);
      // Should not contain "Z"
      expect(formatted).not.toContain('Z');
      // Should contain ±hh:mm offset
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
    });
  });
});
