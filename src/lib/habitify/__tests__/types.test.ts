import { describe, expect, it } from '@jest/globals';
import { ZodError } from 'zod';
import {
  HabitifyAreaSchema,
  HabitifyGoalSchema,
  HabitifyHabitSchema,
  HabitifyLogSchema,
  HabitifyResponseSchema,
} from '../types';

describe('Habitify Zod schemas', () => {
  describe('HabitifyAreaSchema', () => {
    it('should accept a valid area', () => {
      const data = { id: 'area-1', name: 'Health' };
      expect(HabitifyAreaSchema.parse(data)).toEqual(data);
    });

    it('should reject area with missing name', () => {
      expect(() => HabitifyAreaSchema.parse({ id: 'area-1' })).toThrow(
        ZodError,
      );
    });
  });

  describe('HabitifyGoalSchema', () => {
    it('should accept a valid goal', () => {
      const data = { unit_type: 'count', value: 1, periodicity: 'daily' };
      expect(HabitifyGoalSchema.parse(data)).toEqual(data);
    });

    it('should reject goal with string value', () => {
      expect(() =>
        HabitifyGoalSchema.parse({
          unit_type: 'count',
          value: 'one',
          periodicity: 'daily',
        }),
      ).toThrow(ZodError);
    });
  });

  describe('HabitifyHabitSchema', () => {
    const validHabit = {
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
    };

    it('should accept a valid habit', () => {
      expect(HabitifyHabitSchema.parse(validHabit)).toEqual(validHabit);
    });

    it('should accept a habit with null area and goal', () => {
      const data = { ...validHabit, area: null, goal: null };
      expect(HabitifyHabitSchema.parse(data)).toEqual(data);
    });

    it('should reject a habit with missing id', () => {
      const { id: _, ...noId } = validHabit;
      expect(() => HabitifyHabitSchema.parse(noId)).toThrow(ZodError);
    });

    it('should strip unknown fields', () => {
      const withExtra = { ...validHabit, unknown_field: true };
      const parsed = HabitifyHabitSchema.parse(withExtra);
      expect(parsed).toEqual(validHabit);
      expect((parsed as Record<string, unknown>)['unknown_field']).toBeUndefined();
    });
  });

  describe('HabitifyLogSchema', () => {
    const validLog = {
      id: 'log-1',
      habit_id: 'habit-1',
      value: 1,
      created_date: '2024-01-15T10:30:00+00:00',
      unit_type: 'count',
    };

    it('should accept a valid log', () => {
      expect(HabitifyLogSchema.parse(validLog)).toEqual(validLog);
    });

    it('should reject a log with missing habit_id', () => {
      const { habit_id: _, ...noHabitId } = validLog;
      expect(() => HabitifyLogSchema.parse(noHabitId)).toThrow(ZodError);
    });
  });

  describe('HabitifyResponseSchema', () => {
    it('should accept a valid response with habit array', () => {
      const schema = HabitifyResponseSchema(HabitifyHabitSchema.array());
      const data = {
        message: 'OK',
        data: [],
        status: true,
        version: 'v1.2',
      };
      expect(schema.parse(data)).toEqual(data);
    });

    it('should reject a response with wrong status type', () => {
      const schema = HabitifyResponseSchema(HabitifyHabitSchema.array());
      expect(() =>
        schema.parse({
          message: 'OK',
          data: [],
          status: 'yes',
          version: 'v1.2',
        }),
      ).toThrow(ZodError);
    });
  });
});
