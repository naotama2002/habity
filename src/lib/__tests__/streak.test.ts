import {describe, expect, it, jest} from '@jest/globals';
import {calculateDisplayStreak, calculateStreak, calculateStreaks} from '../streak';
import type {StreakLogEntry, StreakHabitInfo} from '../streak';

jest.mock('../recurrence', () => ({
  isDateMatchingRRule: (
    rule: string,
    date: Date,
    startDate: Date,
  ) => {
    if (rule === 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR') {
      return [1, 3, 5].includes(date.getDay());
    }

    if (rule === 'RRULE:FREQ=DAILY;INTERVAL=2') {
      const oneDayMs = 24 * 60 * 60 * 1000;
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      const normalizedStart = new Date(startDate);
      normalizedStart.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (normalizedDate.getTime() - normalizedStart.getTime()) / oneDayMs,
      );
      return diffDays >= 0 && diffDays % 2 === 0;
    }

    return true;
  },
}));

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
  it('ログなし → count=0, from=null', () => {
    const result = calculateStreak([], dailyHabit, '2024-03-01');
    expect(result).toEqual({count: 0, from: null});
  });

  it('今日のみ completed → count=1, from=今日', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
    ];
    const result = calculateStreak(logs, dailyHabit, '2024-03-01');
    expect(result).toEqual({count: 1, from: '2024-03-01'});
  });

  it('3日連続 completed → count=3, from=最古日', () => {
    const logs = makeConsecutiveLogs('2024-03-03', 3);
    const result = calculateStreak(logs, dailyHabit, '2024-03-03');
    expect(result).toEqual({count: 3, from: '2024-03-01'});
  });

  it('途中にギャップ（ログなし）→ ギャップ前まで', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-04', status: 'completed'},
      // 2024-03-03 はログなし（ギャップ）
      {target_date: '2024-03-02', status: 'completed'},
      {target_date: '2024-03-01', status: 'completed'},
    ];
    const result = calculateStreak(logs, dailyHabit, '2024-03-05');
    expect(result).toEqual({count: 2, from: '2024-03-04'});
  });

  it('途中に skipped → skipped はカウントせずストリーク維持、from は skipped 含む', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-04', status: 'skipped'},
      {target_date: '2024-03-03', status: 'completed'},
      {target_date: '2024-03-02', status: 'completed'},
    ];
    // completed: 3/5, 3/3, 3/2 = 3。skipped(3/4) はカウントしないが途切れない
    const result = calculateStreak(logs, dailyHabit, '2024-03-05');
    expect(result).toEqual({count: 3, from: '2024-03-02'});
  });

  it('全部 skipped → count=0, from=null', () => {
    const logs = makeConsecutiveLogs('2024-03-03', 3, 'skipped');
    const result = calculateStreak(logs, dailyHabit, '2024-03-03');
    expect(result).toEqual({count: 0, from: null});
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
    const result = calculateStreak(logs, weeklyHabit, '2024-03-08');
    expect(result).toEqual({count: 3, from: '2024-03-04'});
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
    const result = calculateStreak(logs, intervalHabit, '2024-03-07');
    expect(result).toEqual({count: 4, from: '2024-03-01'});
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
    const result = calculateStreak(logs, habit, '2024-03-05');
    expect(result).toEqual({count: 3, from: '2024-03-03'});
  });

  it('今日にログがなく過去にログがある場合 → count=0', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-02-29', status: 'completed'},
    ];
    const result = calculateStreak(logs, dailyHabit, '2024-03-02');
    expect(result).toEqual({count: 0, from: null});
  });

  it('今日が skipped で昨日が completed → count=1, from=昨日', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-02', status: 'skipped'},
      {target_date: '2024-03-01', status: 'completed'},
    ];
    const result = calculateStreak(logs, dailyHabit, '2024-03-02');
    expect(result).toEqual({count: 1, from: '2024-03-01'});
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
    const result = calculateStreak(logs, weeklyHabit, '2024-03-09');
    expect(result).toEqual({count: 2, from: '2024-03-06'});
  });
});

describe('calculateDisplayStreak', () => {
  it('今日が未記録なら昨日までのストリークを返す', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-02-29', status: 'completed'},
    ];

    const result = calculateDisplayStreak(logs, dailyHabit, '2024-03-02', '2024-03-02');
    expect(result).toEqual({count: 2, from: '2024-02-29'});
  });

  it('未来日と今日が未記録でも直近の継続中ストリークを返す', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-02-29', status: 'completed'},
    ];

    const result = calculateDisplayStreak(logs, dailyHabit, '2024-03-03', '2024-03-02');
    expect(result).toEqual({count: 2, from: '2024-02-29'});
  });

  it('過去日の未記録は通常通りストリーク切れとして扱う', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-02-29', status: 'completed'},
    ];

    const result = calculateDisplayStreak(logs, dailyHabit, '2024-03-02', '2024-03-05');
    expect(result).toEqual({count: 0, from: null});
  });
});

  describe('end_date handling', () => {
    it('end_date が過去 → end_date から走査開始', () => {
      const habit: StreakHabitInfo = {
        recurrence_rule: null,
        start_date: '2024-01-01',
        end_date: '2024-03-03',
      };
      const logs = makeConsecutiveLogs('2024-03-03', 3);
      // today = 2024-03-10 だが end_date=3/3 なので 3/3 から走査
      const result = calculateStreak(logs, habit, '2024-03-10');
      expect(result).toEqual({count: 3, from: '2024-03-01'});
    });

    it('end_date が今日 → 通常通り', () => {
      const habit: StreakHabitInfo = {
        recurrence_rule: null,
        start_date: '2024-01-01',
        end_date: '2024-03-05',
      };
      const logs = makeConsecutiveLogs('2024-03-05', 3);
      const result = calculateStreak(logs, habit, '2024-03-05');
      expect(result).toEqual({count: 3, from: '2024-03-03'});
    });

    it('end_date が未来 → 通常通り', () => {
      const habit: StreakHabitInfo = {
        recurrence_rule: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };
      const logs = makeConsecutiveLogs('2024-03-05', 3);
      const result = calculateStreak(logs, habit, '2024-03-05');
      expect(result).toEqual({count: 3, from: '2024-03-03'});
    });

    it('end_date = null → 通常通り（既存動作）', () => {
      const habit: StreakHabitInfo = {
        recurrence_rule: null,
        start_date: '2024-01-01',
        end_date: null,
      };
      const logs = makeConsecutiveLogs('2024-03-05', 3);
      const result = calculateStreak(logs, habit, '2024-03-05');
      expect(result).toEqual({count: 3, from: '2024-03-03'});
    });

    it('end_date = start_date（1日だけの習慣）', () => {
      const habit: StreakHabitInfo = {
        recurrence_rule: null,
        start_date: '2024-03-01',
        end_date: '2024-03-01',
      };
      const logs: StreakLogEntry[] = [
        {target_date: '2024-03-01', status: 'completed'},
      ];
      const result = calculateStreak(logs, habit, '2024-03-10');
      expect(result).toEqual({count: 1, from: '2024-03-01'});
    });
  });

describe('weekly streak calculation', () => {
  const weeklyHabitInfo: StreakHabitInfo = {
    recurrence_rule: null,
    start_date: '2024-01-01',
    goal_period: 'weekly',
    goal_value: 3,
  };

  it('1週間で3回達成 → streak=1', () => {
    // Week of 2024-03-04 (Mon) to 2024-03-10 (Sun)
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-04', status: 'completed'},
      {target_date: '2024-03-06', status: 'completed'},
      {target_date: '2024-03-08', status: 'completed'},
    ];
    const result = calculateStreak(logs, weeklyHabitInfo, '2024-03-10');
    expect(result).toEqual({count: 1, from: '2024-03-04'});
  });

  it('2週連続で目標達成 → streak=2', () => {
    const logs: StreakLogEntry[] = [
      // Week 2: 2024-03-04 to 2024-03-10
      {target_date: '2024-03-04', status: 'completed'},
      {target_date: '2024-03-06', status: 'completed'},
      {target_date: '2024-03-08', status: 'completed'},
      // Week 1: 2024-02-26 to 2024-03-03
      {target_date: '2024-02-26', status: 'completed'},
      {target_date: '2024-02-28', status: 'completed'},
      {target_date: '2024-03-01', status: 'completed'},
    ];
    const result = calculateStreak(logs, weeklyHabitInfo, '2024-03-10');
    expect(result).toEqual({count: 2, from: '2024-02-26'});
  });

  it('今週未達成 → streak=0', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-04', status: 'completed'},
      {target_date: '2024-03-06', status: 'completed'},
      // only 2, need 3
    ];
    const result = calculateStreak(logs, weeklyHabitInfo, '2024-03-10');
    expect(result).toEqual({count: 0, from: null});
  });

  it('ログなし → streak=0', () => {
    const result = calculateStreak([], weeklyHabitInfo, '2024-03-10');
    expect(result).toEqual({count: 0, from: null});
  });

  it('goal_value 超過でも達成とみなす', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-04', status: 'completed'},
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-06', status: 'completed'},
      {target_date: '2024-03-07', status: 'completed'},
      {target_date: '2024-03-08', status: 'completed'},
    ];
    const result = calculateStreak(logs, weeklyHabitInfo, '2024-03-10');
    expect(result).toEqual({count: 1, from: '2024-03-04'});
  });
});

describe('monthly streak calculation', () => {
  const monthlyHabitInfo: StreakHabitInfo = {
    recurrence_rule: null,
    start_date: '2024-01-01',
    goal_period: 'monthly',
    goal_value: 5,
  };

  it('1ヶ月で5回達成 → streak=1', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-10', status: 'completed'},
      {target_date: '2024-03-15', status: 'completed'},
      {target_date: '2024-03-20', status: 'completed'},
    ];
    const result = calculateStreak(logs, monthlyHabitInfo, '2024-03-31');
    expect(result).toEqual({count: 1, from: '2024-03-01'});
  });

  it('2ヶ月連続で目標達成 → streak=2', () => {
    const logs: StreakLogEntry[] = [
      // March
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-03-05', status: 'completed'},
      {target_date: '2024-03-10', status: 'completed'},
      {target_date: '2024-03-15', status: 'completed'},
      {target_date: '2024-03-20', status: 'completed'},
      // February
      {target_date: '2024-02-01', status: 'completed'},
      {target_date: '2024-02-05', status: 'completed'},
      {target_date: '2024-02-10', status: 'completed'},
      {target_date: '2024-02-15', status: 'completed'},
      {target_date: '2024-02-20', status: 'completed'},
    ];
    const result = calculateStreak(logs, monthlyHabitInfo, '2024-03-31');
    expect(result).toEqual({count: 2, from: '2024-02-01'});
  });

  it('今月未達成 → streak=0', () => {
    const logs: StreakLogEntry[] = [
      {target_date: '2024-03-01', status: 'completed'},
      {target_date: '2024-03-05', status: 'completed'},
      // only 2, need 5
    ];
    const result = calculateStreak(logs, monthlyHabitInfo, '2024-03-31');
    expect(result).toEqual({count: 0, from: null});
  });
});

describe('weekly streak preview pending', () => {
  const weeklyHabitInfo: StreakHabitInfo = {
    recurrence_rule: null,
    start_date: '2024-01-01',
    goal_period: 'weekly',
    goal_value: 3,
  };

  it('今週未達成でも前週達成済みならプレビューストリークを返す', () => {
    const logs: StreakLogEntry[] = [
      // 今週 (4/8-4/14): 2/3 未達成
      {target_date: '2024-04-08', status: 'completed'},
      {target_date: '2024-04-09', status: 'completed'},
      // 先週 (4/1-4/7): 3/3 達成
      {target_date: '2024-04-01', status: 'completed'},
      {target_date: '2024-04-03', status: 'completed'},
      {target_date: '2024-04-05', status: 'completed'},
    ];
    // previewPending=false → 今週未達成でストリーク0
    const strict = calculateStreak(logs, weeklyHabitInfo, '2024-04-10', 1, false);
    expect(strict).toEqual({count: 0, from: null});

    // previewPending=true → 今週をスキップして先週からストリーク1
    const preview = calculateStreak(logs, weeklyHabitInfo, '2024-04-10', 1, true);
    expect(preview).toEqual({count: 1, from: '2024-04-01'});
  });

  it('今週達成済みなら通常通りストリークを返す', () => {
    const logs: StreakLogEntry[] = [
      // 今週 (4/8-4/14): 3/3 達成
      {target_date: '2024-04-08', status: 'completed'},
      {target_date: '2024-04-09', status: 'completed'},
      {target_date: '2024-04-10', status: 'completed'},
      // 先週 (4/1-4/7): 3/3 達成
      {target_date: '2024-04-01', status: 'completed'},
      {target_date: '2024-04-03', status: 'completed'},
      {target_date: '2024-04-05', status: 'completed'},
    ];
    const result = calculateStreak(logs, weeklyHabitInfo, '2024-04-10', 1, true);
    expect(result).toEqual({count: 2, from: '2024-04-01'});
  });

  it('前週も未達成ならプレビューでもストリーク0', () => {
    const logs: StreakLogEntry[] = [
      // 今週: 1/3
      {target_date: '2024-04-08', status: 'completed'},
      // 先週: 2/3
      {target_date: '2024-04-01', status: 'completed'},
      {target_date: '2024-04-03', status: 'completed'},
    ];
    const result = calculateStreak(logs, weeklyHabitInfo, '2024-04-10', 1, true);
    expect(result).toEqual({count: 0, from: null});
  });
});

describe('daily→weekly 変更時のストリーク', () => {
  it('毎日チェックしていた習慣を週3回に変更 → 過去の週もカウントされる', () => {
    // 2週間毎日チェック済みの状態で goal_period を weekly/3 に変更
    const habit: StreakHabitInfo = {
      recurrence_rule: null,
      start_date: '2024-03-25',
      goal_period: 'weekly',
      goal_value: 3,
    };
    const logs: StreakLogEntry[] = [
      // Week 2: 4/1(Mon)-4/7(Sun) 毎日
      ...['2024-04-01', '2024-04-02', '2024-04-03', '2024-04-04',
        '2024-04-05', '2024-04-06', '2024-04-07'].map(d => ({
        target_date: d, status: 'completed' as const,
      })),
      // Week 1: 3/25(Mon)-3/31(Sun) 毎日
      ...['2024-03-25', '2024-03-26', '2024-03-27', '2024-03-28',
        '2024-03-29', '2024-03-30', '2024-03-31'].map(d => ({
        target_date: d, status: 'completed' as const,
      })),
    ];
    const result = calculateStreak(logs, habit, '2024-04-07');
    // 各週7回 >= 3回なので2週連続達成
    expect(result).toEqual({count: 2, from: '2024-03-25'});
  });

  it('週2回しかやらない週があった習慣を週3回に変更 → その週でストリーク切れ', () => {
    const habit: StreakHabitInfo = {
      recurrence_rule: null,
      start_date: '2024-03-25',
      goal_period: 'weekly',
      goal_value: 3,
    };
    const logs: StreakLogEntry[] = [
      // Week 3: 4/8-4/14 → 5回
      ...['2024-04-08', '2024-04-09', '2024-04-10', '2024-04-11', '2024-04-12'].map(d => ({
        target_date: d, status: 'completed' as const,
      })),
      // Week 2: 4/1-4/7 → 2回（未達成）
      ...['2024-04-01', '2024-04-03'].map(d => ({
        target_date: d, status: 'completed' as const,
      })),
      // Week 1: 3/25-3/31 → 7回
      ...['2024-03-25', '2024-03-26', '2024-03-27', '2024-03-28',
        '2024-03-29', '2024-03-30', '2024-03-31'].map(d => ({
        target_date: d, status: 'completed' as const,
      })),
    ];
    const result = calculateStreak(logs, habit, '2024-04-12');
    // Week3=5>=3 OK, Week2=2<3 NG → streak=1 (Week3のみ)
    expect(result).toEqual({count: 1, from: '2024-04-08'});
  });

  it('skipped のみの日は completed にカウントされない', () => {
    const habit: StreakHabitInfo = {
      recurrence_rule: null,
      start_date: '2024-04-01',
      goal_period: 'weekly',
      goal_value: 3,
    };
    const logs: StreakLogEntry[] = [
      {target_date: '2024-04-01', status: 'completed'},
      {target_date: '2024-04-02', status: 'completed'},
      {target_date: '2024-04-03', status: 'skipped'},
      {target_date: '2024-04-04', status: 'skipped'},
      {target_date: '2024-04-05', status: 'completed'},
    ];
    // completed=3, skipped はカウントしない → 3>=3 で達成
    const result = calculateStreak(logs, habit, '2024-04-07');
    expect(result).toEqual({count: 1, from: '2024-04-01'});
  });
});

describe('calculateDisplayStreak for weekly habits', () => {
  it('weekly 習慣でプレビューストリークを返す', () => {
    const habit: StreakHabitInfo = {
      recurrence_rule: null,
      start_date: '2024-01-01',
      goal_period: 'weekly',
      goal_value: 3,
    };
    const logs: StreakLogEntry[] = [
      // 今週: 2/3 未達成
      {target_date: '2024-04-08', status: 'completed'},
      {target_date: '2024-04-09', status: 'completed'},
      // 先週: 3/3 達成
      {target_date: '2024-04-01', status: 'completed'},
      {target_date: '2024-04-03', status: 'completed'},
      {target_date: '2024-04-05', status: 'completed'},
    ];
    const result = calculateDisplayStreak(logs, habit, '2024-04-10', '2024-04-10');
    expect(result).toEqual({count: 1, from: '2024-04-01'});
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
      'habit-1': {count: 5, from: '2024-03-01'},
      'habit-2': {count: 2, from: '2024-03-04'},
      'habit-3': {count: 0, from: null},
    });
  });

  it('ログが存在しない習慣IDは count=0 を返す', () => {
    const logsByHabit: Record<string, StreakLogEntry[]> = {};
    const habits: Record<string, StreakHabitInfo> = {
      'habit-1': {recurrence_rule: null, start_date: '2024-01-01'},
    };

    const result = calculateStreaks(logsByHabit, habits, '2024-03-05');
    expect(result).toEqual({'habit-1': {count: 0, from: null}});
  });
});
