import {describe, expect, it} from '@jest/globals';
import {
  buildRRule,
  parseRRule,
  isDateMatchingRRule,
  getRecurrenceLabel,
} from '../recurrence';

describe('recurrence utilities', () => {
  describe('buildRRule', () => {
    it('should build weekly rule with Mon, Wed, Fri', () => {
      const result = buildRRule('weekly', {weekdays: [0, 2, 4]});
      expect(result).toContain('FREQ=WEEKLY');
      expect(result).toContain('BYDAY=MO,WE,FR');
    });

    it('should build weekly rule with all days', () => {
      const result = buildRRule('weekly', {
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      });
      expect(result).toContain('FREQ=WEEKLY');
      expect(result).toContain('BYDAY=');
    });

    it('should build monthly rule with 1st and 15th', () => {
      const result = buildRRule('monthly', {monthdays: [1, 15]});
      expect(result).toContain('FREQ=MONTHLY');
      expect(result).toContain('BYMONTHDAY=1,15');
    });

    it('should build interval rule for every 3 days', () => {
      const result = buildRRule('interval', {interval: 3});
      expect(result).toContain('FREQ=DAILY');
      expect(result).toContain('INTERVAL=3');
    });

    it('should build interval rule for every day (interval=1)', () => {
      const result = buildRRule('interval', {interval: 1});
      expect(result).toContain('FREQ=DAILY');
    });
  });

  describe('parseRRule', () => {
    it('should parse weekly rule', () => {
      const rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR';
      const result = parseRRule(rrule);
      expect(result.type).toBe('weekly');
      expect(result.weekdays).toEqual([0, 2, 4]);
    });

    it('should parse monthly rule', () => {
      const rrule = 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15';
      const result = parseRRule(rrule);
      expect(result.type).toBe('monthly');
      expect(result.monthdays).toEqual([1, 15]);
    });

    it('should parse daily interval rule', () => {
      const rrule = 'RRULE:FREQ=DAILY;INTERVAL=3';
      const result = parseRRule(rrule);
      expect(result.type).toBe('interval');
      expect(result.interval).toBe(3);
    });

    it('should parse daily rule without interval as interval=1', () => {
      const rrule = 'RRULE:FREQ=DAILY';
      const result = parseRRule(rrule);
      expect(result.type).toBe('interval');
      expect(result.interval).toBe(1);
    });

    it('should parse Habitify format with DTSTART', () => {
      const rrule = 'DTSTART:20240101T000000Z\nRRULE:FREQ=DAILY;INTERVAL=1';
      const result = parseRRule(rrule);
      expect(result.type).toBe('interval');
      expect(result.interval).toBe(1);
    });

    it('should parse Habitify weekly format with DTSTART', () => {
      const rrule =
        'DTSTART:20240101T000000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
      const result = parseRRule(rrule);
      expect(result.type).toBe('weekly');
      expect(result.weekdays).toEqual([0, 1, 2, 3, 4]);
    });

    it('should roundtrip buildRRule → parseRRule for weekly', () => {
      const rrule = buildRRule('weekly', {weekdays: [0, 2, 4]});
      const parsed = parseRRule(rrule);
      expect(parsed.type).toBe('weekly');
      expect(parsed.weekdays).toEqual([0, 2, 4]);
    });

    it('should roundtrip buildRRule → parseRRule for monthly', () => {
      const rrule = buildRRule('monthly', {monthdays: [1, 15, 28]});
      const parsed = parseRRule(rrule);
      expect(parsed.type).toBe('monthly');
      expect(parsed.monthdays).toEqual([1, 15, 28]);
    });

    it('should roundtrip buildRRule → parseRRule for interval', () => {
      const rrule = buildRRule('interval', {interval: 5});
      const parsed = parseRRule(rrule);
      expect(parsed.type).toBe('interval');
      expect(parsed.interval).toBe(5);
    });
  });

  describe('isDateMatchingRRule', () => {
    describe('weekly rules', () => {
      const monWedFri = 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR';

      it('should match Monday', () => {
        // 2024-01-01 is Monday
        const date = new Date(2024, 0, 1);
        expect(isDateMatchingRRule(monWedFri, date)).toBe(true);
      });

      it('should match Wednesday', () => {
        // 2024-01-03 is Wednesday
        const date = new Date(2024, 0, 3);
        expect(isDateMatchingRRule(monWedFri, date)).toBe(true);
      });

      it('should match Friday', () => {
        // 2024-01-05 is Friday
        const date = new Date(2024, 0, 5);
        expect(isDateMatchingRRule(monWedFri, date)).toBe(true);
      });

      it('should not match Tuesday', () => {
        // 2024-01-02 is Tuesday
        const date = new Date(2024, 0, 2);
        expect(isDateMatchingRRule(monWedFri, date)).toBe(false);
      });

      it('should not match Saturday', () => {
        // 2024-01-06 is Saturday
        const date = new Date(2024, 0, 6);
        expect(isDateMatchingRRule(monWedFri, date)).toBe(false);
      });

      it('should not match Sunday', () => {
        // 2024-01-07 is Sunday
        const date = new Date(2024, 0, 7);
        expect(isDateMatchingRRule(monWedFri, date)).toBe(false);
      });
    });

    describe('monthly rules', () => {
      const firstAndFifteenth = 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15';

      it('should match 1st of month', () => {
        const date = new Date(2024, 0, 1);
        expect(isDateMatchingRRule(firstAndFifteenth, date)).toBe(true);
      });

      it('should match 15th of month', () => {
        const date = new Date(2024, 0, 15);
        expect(isDateMatchingRRule(firstAndFifteenth, date)).toBe(true);
      });

      it('should not match 2nd of month', () => {
        const date = new Date(2024, 0, 2);
        expect(isDateMatchingRRule(firstAndFifteenth, date)).toBe(false);
      });

      it('should match 1st of different months', () => {
        expect(
          isDateMatchingRRule(firstAndFifteenth, new Date(2024, 5, 1)),
        ).toBe(true);
        expect(
          isDateMatchingRRule(firstAndFifteenth, new Date(2024, 11, 1)),
        ).toBe(true);
      });
    });

    describe('interval rules', () => {
      it('should always match for interval=1 (every day)', () => {
        const rule = 'RRULE:FREQ=DAILY;INTERVAL=1';
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 1))).toBe(true);
        expect(isDateMatchingRRule(rule, new Date(2024, 5, 15))).toBe(true);
      });

      it('should match every 3 days from start date', () => {
        const rule = 'RRULE:FREQ=DAILY;INTERVAL=3';
        const start = new Date(2024, 0, 1);

        // Day 0: match
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 1), start)).toBe(
          true,
        );
        // Day 1: no match
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 2), start)).toBe(
          false,
        );
        // Day 2: no match
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 3), start)).toBe(
          false,
        );
        // Day 3: match
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 4), start)).toBe(
          true,
        );
        // Day 6: match
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 7), start)).toBe(
          true,
        );
      });

      it('should not match dates before start date', () => {
        const rule = 'RRULE:FREQ=DAILY;INTERVAL=3';
        const start = new Date(2024, 0, 10);
        expect(isDateMatchingRRule(rule, new Date(2024, 0, 5), start)).toBe(
          false,
        );
      });
    });

    describe('Habitify format', () => {
      it('should handle DTSTART + RRULE format', () => {
        const rrule =
          'DTSTART:20240101T000000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR';
        // 2024-01-03 is Wednesday
        expect(isDateMatchingRRule(rrule, new Date(2024, 0, 3))).toBe(true);
        // 2024-01-02 is Tuesday
        expect(isDateMatchingRRule(rrule, new Date(2024, 0, 2))).toBe(false);
      });
    });
  });

  describe('getRecurrenceLabel', () => {
    it('should return label for weekly rule', () => {
      const rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR';
      expect(getRecurrenceLabel(rrule)).toBe('Weekly Mon,Wed,Fri');
    });

    it('should return label for monthly rule', () => {
      const rrule = 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15';
      expect(getRecurrenceLabel(rrule)).toBe('Monthly 1,15');
    });

    it('should return label for every day', () => {
      const rrule = 'RRULE:FREQ=DAILY;INTERVAL=1';
      expect(getRecurrenceLabel(rrule)).toBe('Every day');
    });

    it('should return label for interval rule', () => {
      const rrule = 'RRULE:FREQ=DAILY;INTERVAL=3';
      expect(getRecurrenceLabel(rrule)).toBe('Every 3 days');
    });
  });
});
