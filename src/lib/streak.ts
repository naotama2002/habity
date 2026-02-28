/**
 * クライアントサイドのストリーク計算（リファレンス実装）
 *
 * 本番環境では PostgreSQL RPC 関数 `calculate_streaks` がサーバーサイドで計算する。
 * このファイルはアルゴリズムの参照用およびテスト目的で維持する。
 *
 * アルゴリズム:
 * - 今日から過去方向に走査
 * - スケジュール対象日でない日はスキップ
 * - 対象日に completed ログあり → streak++
 * - 対象日に skipped ログあり → ストリーク維持（インクリメントなし）
 * - 対象日にログなし → ストリーク途切れ（終了）
 */

import {isDateMatchingRRule} from './recurrence';

export interface StreakLogEntry {
  target_date: string; // 'YYYY-MM-DD'
  status: 'completed' | 'skipped';
}

export interface StreakHabitInfo {
  recurrence_rule: string | null;
  start_date: string;
  end_date?: string | null;
}

export interface StreakResult {
  /** 連続達成日数 */
  count: number;
  /** ストリーク開始日（最も古い日）。count=0 の場合は null */
  from: string | null;
}

/** 最大遡り日数（安全制限） */
const MAX_LOOKBACK_DAYS = 365;

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
 * 日付を1日戻す（ミュータブル）
 */
function subtractOneDay(date: Date): void {
  date.setDate(date.getDate() - 1);
}

/**
 * 指定日がリカレンスルールに該当するか判定
 */
function isScheduledDate(
  date: Date,
  habit: StreakHabitInfo,
): boolean {
  if (!habit.recurrence_rule) return true;
  return isDateMatchingRRule(
    habit.recurrence_rule,
    date,
    new Date(habit.start_date),
  );
}

/**
 * 単一習慣のストリーク計算
 */
export function calculateStreak(
  logs: StreakLogEntry[],
  habit: StreakHabitInfo,
  today?: string,
): StreakResult {
  // ログを Map に変換して O(1) ルックアップ
  const logMap = new Map<string, 'completed' | 'skipped'>();
  for (const log of logs) {
    logMap.set(log.target_date, log.status);
  }

  const currentDate = today
    ? new Date(today + 'T00:00:00')
    : new Date();
  // 時間部分をリセット
  currentDate.setHours(0, 0, 0, 0);

  // end_date が過去なら end_date から走査開始
  if (habit.end_date) {
    const endDate = new Date(habit.end_date + 'T00:00:00');
    endDate.setHours(0, 0, 0, 0);
    if (endDate < currentDate) {
      currentDate.setTime(endDate.getTime());
    }
  }

  const startDate = new Date(habit.start_date + 'T00:00:00');
  startDate.setHours(0, 0, 0, 0);

  let streak = 0;
  let daysChecked = 0;
  let fromDate: string | null = null;

  while (daysChecked < MAX_LOOKBACK_DAYS) {
    const dateStr = formatDate(currentDate);

    // start_date より前は走査しない
    if (currentDate < startDate) break;

    // スケジュール対象日でなければスキップ
    if (!isScheduledDate(currentDate, habit)) {
      subtractOneDay(currentDate);
      daysChecked++;
      continue;
    }

    const status = logMap.get(dateStr);

    if (status === 'completed') {
      streak++;
      fromDate = dateStr;
    } else if (status === 'skipped') {
      // skipped はストリーク維持（インクリメントなし）
      fromDate = dateStr;
    } else {
      // ログなし → ストリーク途切れ
      break;
    }

    subtractOneDay(currentDate);
    daysChecked++;
  }

  return {count: streak, from: streak > 0 ? fromDate : null};
}

/**
 * 複数習慣のストリーク一括計算
 */
export function calculateStreaks(
  logsByHabit: Record<string, StreakLogEntry[]>,
  habits: Record<string, StreakHabitInfo>,
  today?: string,
): Record<string, StreakResult> {
  const result: Record<string, StreakResult> = {};

  for (const habitId of Object.keys(habits)) {
    const logs = logsByHabit[habitId] ?? [];
    result[habitId] = calculateStreak(logs, habits[habitId], today);
  }

  return result;
}
