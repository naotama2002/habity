import { describe, expect, it } from '@jest/globals';
import { ZodError } from 'zod';
import {
  HabitifyAreaSchema,
  HabitifyGoalSchema,
  HabitifyOccurrenceSchema,
  HabitifyHabitSchema,
  HabitifyDailyProgressSchema,
  HabitifyStatisticsSchema,
  HabitifyV2ResponseSchema,
  HabitifyPaginationSchema,
} from '../types';

describe('Habitify v2 Zod schemas', () => {
  describe('HabitifyAreaSchema', () => {
    it('should accept a valid area', () => {
      const data = { id: 'area-1', name: 'Health' };
      expect(HabitifyAreaSchema.parse(data)).toMatchObject(data);
    });

    it('should accept an area with optional fields', () => {
      const data = {
        id: 'area-1',
        name: 'Health',
        colorHex: '#FF6B6B',
        icon: 'heart',
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(HabitifyAreaSchema.parse(data)).toMatchObject(data);
    });

    it('should reject area with missing name', () => {
      expect(() => HabitifyAreaSchema.parse({ id: 'area-1' })).toThrow(ZodError);
    });
  });

  describe('HabitifyGoalSchema', () => {
    it('should accept a valid goal', () => {
      const data = {
        id: 'goal-1',
        createdAt: '2024-01-01T00:00:00Z',
        periodicity: 'daily',
        value: 5,
        unit: 'rep',
        isActive: true,
      };
      expect(HabitifyGoalSchema.parse(data)).toEqual(data);
    });

    it('should reject goal with string value', () => {
      expect(() =>
        HabitifyGoalSchema.parse({
          id: 'goal-1',
          createdAt: '2024-01-01T00:00:00Z',
          periodicity: 'daily',
          value: 'one',
          unit: 'rep',
          isActive: true,
        }),
      ).toThrow(ZodError);
    });
  });

  describe('HabitifyOccurrenceSchema', () => {
    it('should accept daily occurrence', () => {
      const data = { type: 'daily' as const };
      expect(HabitifyOccurrenceSchema.parse(data)).toEqual(data);
    });

    it('should accept weekDays occurrence', () => {
      const data = { type: 'weekDays' as const, days: [1, 3, 5] };
      expect(HabitifyOccurrenceSchema.parse(data)).toEqual(data);
    });

    it('should accept intervalDays occurrence', () => {
      const data = { type: 'intervalDays' as const, interval: 3 };
      expect(HabitifyOccurrenceSchema.parse(data)).toEqual(data);
    });

    it('should reject unknown occurrence type', () => {
      expect(() =>
        HabitifyOccurrenceSchema.parse({ type: 'unknown' }),
      ).toThrow(ZodError);
    });
  });

  describe('HabitifyHabitSchema', () => {
    const validHabit = {
      id: 'habit-1',
      name: 'Morning Run',
      icon: null,
      colorHex: '#FF6B6B',
      type: 'good',
      description: null,
      occurrence: { type: 'daily' as const },
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

    it('should accept a valid habit', () => {
      expect(HabitifyHabitSchema.parse(validHabit)).toMatchObject(validHabit);
    });

    it('should accept a habit with empty goals and areas', () => {
      const data = { ...validHabit, goals: [], areas: [], timeOfDays: [] };
      expect(HabitifyHabitSchema.parse(data)).toMatchObject(data);
    });

    it('should reject a habit with missing id', () => {
      const { id: _, ...noId } = validHabit;
      expect(() => HabitifyHabitSchema.parse(noId)).toThrow(ZodError);
    });

    it('should strip unknown fields', () => {
      const withExtra = { ...validHabit, unknown_field: true };
      const parsed = HabitifyHabitSchema.parse(withExtra);
      expect((parsed as Record<string, unknown>)['unknown_field']).toBeUndefined();
    });
  });

  describe('HabitifyDailyProgressSchema', () => {
    it('should accept valid daily progress', () => {
      const data = { date: '2024-01-15', totalLog: 3.5, status: 'completed' };
      expect(HabitifyDailyProgressSchema.parse(data)).toEqual(data);
    });

    it('should reject missing status', () => {
      expect(() =>
        HabitifyDailyProgressSchema.parse({ date: '2024-01-15', totalLog: 1 }),
      ).toThrow(ZodError);
    });
  });

  describe('HabitifyStatisticsSchema', () => {
    const validStats = {
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

    it('should accept valid statistics', () => {
      expect(HabitifyStatisticsSchema.parse(validStats)).toMatchObject(validStats);
    });

    it('should accept statistics with null unit', () => {
      const data = { ...validStats, unit: null };
      expect(HabitifyStatisticsSchema.parse(data)).toMatchObject(data);
    });

    it('should accept statistics with empty dailyProgress', () => {
      const data = { ...validStats, dailyProgress: [] };
      expect(HabitifyStatisticsSchema.parse(data)).toMatchObject(data);
    });
  });

  describe('HabitifyV2ResponseSchema', () => {
    it('should accept a response with habit array and pagination', () => {
      const schema = HabitifyV2ResponseSchema(HabitifyHabitSchema.array());
      const data = {
        data: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      };
      expect(schema.parse(data)).toEqual(data);
    });

    it('should accept a response without pagination', () => {
      const schema = HabitifyV2ResponseSchema(HabitifyStatisticsSchema);
      const data = {
        data: {
          id: 'h-1',
          name: 'Test',
          totalLogs: 0,
          skips: 0,
          fails: 0,
          completions: 0,
          dailyProgress: [],
        },
      };
      expect(schema.parse(data)).toMatchObject(data);
    });
  });

  describe('HabitifyPaginationSchema', () => {
    it('should accept valid pagination', () => {
      const data = { total: 100, limit: 50, offset: 0 };
      expect(HabitifyPaginationSchema.parse(data)).toEqual(data);
    });

    it('should reject missing total', () => {
      expect(() =>
        HabitifyPaginationSchema.parse({ limit: 50, offset: 0 }),
      ).toThrow(ZodError);
    });
  });
});
