import {
  getPeriodRange,
  getCompletedCountInPeriod,
  isPeriodGoalMet,
} from '../period';

describe('getPeriodRange', () => {
  describe('daily', () => {
    it('returns the same date for start and end', () => {
      expect(getPeriodRange('2026-04-06', 'daily')).toEqual({
        start: '2026-04-06',
        end: '2026-04-06',
      });
    });
  });

  describe('weekly (weekStart=1, Monday)', () => {
    it.each([
      // [date, expected start (Mon), expected end (Sun)]
      ['2026-04-06', '2026-04-06', '2026-04-12'], // Monday
      ['2026-04-07', '2026-04-06', '2026-04-12'], // Tuesday
      ['2026-04-08', '2026-04-06', '2026-04-12'], // Wednesday
      ['2026-04-09', '2026-04-06', '2026-04-12'], // Thursday
      ['2026-04-10', '2026-04-06', '2026-04-12'], // Friday
      ['2026-04-11', '2026-04-06', '2026-04-12'], // Saturday
      ['2026-04-12', '2026-04-06', '2026-04-12'], // Sunday
    ])('date %s → %s to %s', (date, expectedStart, expectedEnd) => {
      expect(getPeriodRange(date, 'weekly', 1)).toEqual({
        start: expectedStart,
        end: expectedEnd,
      });
    });
  });

  describe('weekly (weekStart=0, Sunday)', () => {
    it.each([
      ['2026-04-05', '2026-04-05', '2026-04-11'], // Sunday
      ['2026-04-06', '2026-04-05', '2026-04-11'], // Monday
      ['2026-04-11', '2026-04-05', '2026-04-11'], // Saturday
      ['2026-04-12', '2026-04-12', '2026-04-18'], // next Sunday
    ])('date %s → %s to %s', (date, expectedStart, expectedEnd) => {
      expect(getPeriodRange(date, 'weekly', 0)).toEqual({
        start: expectedStart,
        end: expectedEnd,
      });
    });
  });

  describe('weekly across year boundary', () => {
    it('handles week spanning Dec-Jan', () => {
      // 2025-12-29 is Monday, week ends 2026-01-04
      expect(getPeriodRange('2025-12-31', 'weekly', 1)).toEqual({
        start: '2025-12-29',
        end: '2026-01-04',
      });
    });
  });

  describe('monthly', () => {
    it.each([
      ['2026-04-01', '2026-04-01', '2026-04-30'],
      ['2026-04-15', '2026-04-01', '2026-04-30'],
      ['2026-04-30', '2026-04-01', '2026-04-30'],
      ['2026-02-14', '2026-02-01', '2026-02-28'], // non-leap year
      ['2024-02-14', '2024-02-01', '2024-02-29'], // leap year
      ['2026-12-31', '2026-12-01', '2026-12-31'],
      ['2026-01-01', '2026-01-01', '2026-01-31'],
    ])('date %s → %s to %s', (date, expectedStart, expectedEnd) => {
      expect(getPeriodRange(date, 'monthly')).toEqual({
        start: expectedStart,
        end: expectedEnd,
      });
    });
  });
});

describe('getCompletedCountInPeriod', () => {
  const logs = [
    {target_date: '2026-04-06', status: 'completed'},
    {target_date: '2026-04-07', status: 'completed'},
    {target_date: '2026-04-08', status: 'skipped'},
    {target_date: '2026-04-09', status: 'completed'},
    {target_date: '2026-04-13', status: 'completed'}, // outside week
  ];

  it('counts only completed logs within the period', () => {
    expect(getCompletedCountInPeriod(logs, '2026-04-06', '2026-04-12')).toBe(3);
  });

  it('returns 0 for empty logs', () => {
    expect(getCompletedCountInPeriod([], '2026-04-06', '2026-04-12')).toBe(0);
  });

  it('excludes skipped logs', () => {
    const skippedOnly = [{target_date: '2026-04-07', status: 'skipped'}];
    expect(getCompletedCountInPeriod(skippedOnly, '2026-04-06', '2026-04-12')).toBe(0);
  });

  it('includes boundary dates', () => {
    const boundaryLogs = [
      {target_date: '2026-04-06', status: 'completed'},
      {target_date: '2026-04-12', status: 'completed'},
    ];
    expect(getCompletedCountInPeriod(boundaryLogs, '2026-04-06', '2026-04-12')).toBe(2);
  });
});

describe('isPeriodGoalMet', () => {
  it.each([
    [0, 3, false],
    [2, 3, false],
    [3, 3, true],
    [5, 3, true], // exceeded
    [1, 1, true],
  ])('completedCount=%i, goalValue=%i → %s', (completed, goal, expected) => {
    expect(isPeriodGoalMet(completed, goal)).toBe(expected);
  });
});
