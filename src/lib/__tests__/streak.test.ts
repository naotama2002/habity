import {describe, expect, it} from '@jest/globals';
import {calculateStreak, calculateStreaks} from '../streak';
import type {StreakLogEntry, StreakHabitInfo} from '../streak';

/**
 * ヘルパー: 連続する日付のログを生成
 * endDate から pastDays 日分遡って completed ログを作成
 */
function makeConsecutiveLogs(
  endDate: string,
  count: number,
  status: 'completed' | 'skipped' = 'completed',
): StreakLogEntry[] {
  const logs: StreakLogEntry[] = [];
  const date = new Date(endDate + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    logs.push({target_date: `${y}-${m}-${d}`, status});
    date.setDate(date.getDate() - 1);
  }
  return logs;
}

const dailyHabit: StreakHabitInfo = {
  recurrence_rule: null,
  start_date: '2024-01-01',
};

describe('calculateStreak', () => {
  it('ログなし → 0', () => {
    expect(calculateStreak([], dailyHabit, '2024-03-01')).toBe(0);
  });

  it('今日のみ completed → 1', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
    ];
    expect(calculateStreak(logs, dailyHabit, '2024-03-01')).toBe(1);
  });

  it('3日連続 completed → 3', () => {
    const logs = makeConsecutiveLogs('2024-03-03', 3);
    expect(calculateStreak(logs, dailyHabit, '2024-03-03')).toBe(3);
  });

  it('途中にギャップ（ログなし）→ ギャップ前まで', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-04', status: 'completed'},
      // 2024-03-03 はログなし（ギャップ）
      {target_date: '2024-03-02', status: 'completed'},
      {target_date: '2024-03-01', status: 'completed'},
    ];
    expect(calculateStreak(logs, dailyHabit, '2024-03-05')).toBe(2);
  });

  it('途中に skipped → skipped はカウントせずストリーク維持', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-04', status: 'skipped'},
      {target_date: '2024-03-03', status: 'completed'},
      {target_date: '2024-03-02', status: 'completed'},
    ];
    // completed: 3/5, 3/3, 3/2 = 3。skipped(3/4) はカウントしないが途切れない
    expect(calculateStreak(logs, dailyHabit, '2024-03-05')).toBe(3);
  });

  it('全部 skipped → 0', () => {
    const logs = makeConsecutiveLogs('2024-03-03', 3, 'skipped');
    expect(calculateStreak(logs, dailyHabit, '2024-03-03')).toBe(0);
  });

  it('週3回の習慣（Mon/Wed/Fri）で非対象日をスキップ', () => {
    const weeklyHabit: StreakHabitInfo = {
      recurrence_rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
      start_date: '2024-01-01',
    };
    // 2024-03-08 = Friday
    // 2024-03-06 = Wednesday
    // 2024-03-04 = Monday
    // Tue, Thu, Sat, Sun は非対象日としてスキップされる
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-08', status: 'completed'}, // Fri
      {target_date: '2024-03-06', status: 'completed'}, // Wed
      {target_date: '2024-03-04', status: 'completed'}, // Mon
    ];
    expect(calculateStreak(logs, weeklyHabit, '2024-03-08')).toBe(3);
  });

  it('interval=2 の習慣で非対象日をスキップ', () => {
    const intervalHabit: StreakHabitInfo = {
      recurrence_rule: 'RRULE:FREQ=DAILY;INTERVAL=2',
      start_date: '2024-03-01',
    };
    // start=3/1 → 対象日: 3/1, 3/3, 3/5, 3/7 ...
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-07', status: 'completed'},
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-03', status: 'completed'},
      {target_date: '2024-03-01', status: 'completed'},
    ];
    expect(calculateStreak(logs, intervalHabit, '2024-03-07')).toBe(4);
  });

  it('start_date 以前は走査しない', () => {
    const habit: StreakHabitInfo = {
      recurrence_rule: null,
      start_date: '2024-03-03',
    };
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-04', status: 'completed'},
      {target_date: '2024-03-03', status: 'completed'},
      // 3/2 以前にもログがあるが start_date 以前なので走査しない
      {target_date: '2024-03-02', status: 'completed'},
    ];
    expect(calculateStreak(logs, habit, '2024-03-05')).toBe(3);
  });

  it('今日にログがなく過去にログがある場合 → 0', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-02-29', status: 'completed'},
    ];
    expect(calculateStreak(logs, dailyHabit, '2024-03-02')).toBe(0);
  });

  it('今日が skipped で昨日が completed → 1', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-02', status: 'skipped'},
      {target_date: '2024-03-01', status: 'completed'},
    ];
    expect(calculateStreak(logs, dailyHabit, '2024-03-02')).toBe(1);
  });

  it('週次習慣で today が非対象日の場合、直近の対象日から計算', () => {
    const weeklyHabit: StreakHabitInfo = {
      recurrence_rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
      start_date: '2024-01-01',
    };
    // 2024-03-09 = Saturday（非対象日）
    // 直近の対象日: 2024-03-08 = Friday
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-08', status: 'completed'}, // Fri
      {target_date: '2024-03-06', status: 'completed'}, // Wed
    ];
    expect(calculateStreak(logs, weeklyHabit, '2024-03-09')).toBe(2);
  });
});

describe('calculateStreaks', () => {
  it('複数習慣のストリークを一括計算', () => {
    const logsByHabit: Record<string, StreakLogEntry[]> = {
      'habit-1': makeConsecutiveLogs('2024-03-05', 5),
      'habit-2': makeConsecutiveLogs('2024-03-05', 2),
      'habit-3': [],
    };
    const habits: Record<string, StreakHabitInfo> = {
      'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
      'habit-2': {recurrence_rule: null, start_date: '2024-01-01'},
      'habit-3': {recurrence_rule: null, start_date: '2024-01-01'},
    };

    const result = calculateStreaks(logsByHabit, habits, '2024-03-05');
    expect(result).toEqual({
      'habit-1': 5,
      'habit-2': 2,
      'habit-3': 0,
    });
  });

  it('ログが存在しない習慣IDは 0 を返す', () => {
    const logsByHabit: Record<string, StreakLogEntry[]> = {};
    const habits: Record<string, StreakHabitInfo> = {
      'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
    };

    const result = calculateStreaks(logsByHabit, habits, '2024-03-05');
    expect(result).toEqual({'habit-1': 0});
  });
});
