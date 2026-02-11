import {describe, expect, it} from '@jest/globals';
import {isSkippedLog, isCompletedLog} from '../habit-log-helpers';
import type {LogStatus} from '@/types/database';

describe('habit-log-helpers', () => {
  describe('isSkippedLog', () => {
    it.each<{input: LogStatus | null | undefined; expected: boolean}>([
      {input: 'skipped', expected: true},
      {input: 'completed', expected: false},
      {input: null, expected: false},
      {input: undefined, expected: false},
    ])('should return $expected for status=$input', ({input, expected}) => {
      expect(isSkippedLog(input)).toBe(expected);
    });
  });

  describe('isCompletedLog', () => {
    it.each<{input: LogStatus | null | undefined; expected: boolean}>([
      {input: 'completed', expected: true},
      {input: 'skipped', expected: false},
      {input: null, expected: false},
      {input: undefined, expected: false},
    ])('should return $expected for status=$input', ({input, expected}) => {
      expect(isCompletedLog(input)).toBe(expected);
    });
  });
});
