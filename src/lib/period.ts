/**
 * 期間(daily/weekly/monthly)の境界計算ユーティリティ
 *
 * 頻度ベースの習慣(例: 週3回)の達成判定に使用する。
 */

import type {GoalPeriod} from '@/types/database';

export interface PeriodRange {
  start: string; // 'YYYY-MM-DD'
  end: string; // 'YYYY-MM-DD'
}

/**
 * 日付文字列を 'YYYY-MM-DD' 形式で返す
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 指定日が属する期間の開始日・終了日を返す
 *
 * @param date 対象日 ('YYYY-MM-DD')
 * @param period 'daily' | 'weekly' | 'monthly'
 * @param weekStart 週の開始曜日 (0=日曜, 1=月曜, ..., 6=土曜)
 */
export function getPeriodRange(
  date: string,
  period: GoalPeriod,
  weekStart: number = 1,
): PeriodRange {
  const d = new Date(date + 'T00:00:00');

  switch (period) {
    case 'daily':
      return {start: date, end: date};

    case 'weekly': {
      // JS Date.getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      const jsDay = d.getDay();
      // weekStart からの差分を計算（0-6）
      const diff = (jsDay - weekStart + 7) % 7;
      const start = new Date(d);
      start.setDate(start.getDate() - diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return {start: formatDate(start), end: formatDate(end)};
    }

    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {start: formatDate(start), end: formatDate(end)};
    }
  }
}

/**
 * 期間内の completed ログ数をカウントする
 *
 * @param logs ログ配列（target_date と status を持つ）
 * @param periodStart 期間開始日 ('YYYY-MM-DD')
 * @param periodEnd 期間終了日 ('YYYY-MM-DD')
 */
export function getCompletedCountInPeriod(
  logs: {target_date: string; status: string}[],
  periodStart: string,
  periodEnd: string,
): number {
  return logs.filter(
    l =>
      l.status === 'completed' &&
      l.target_date >= periodStart &&
      l.target_date <= periodEnd,
  ).length;
}

/**
 * 期間目標を達成しているか判定
 */
export function isPeriodGoalMet(
  completedCount: number,
  goalValue: number,
): boolean {
  return completedCount >= goalValue;
}
