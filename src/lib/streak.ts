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
 *
 * Today 画面のプレビュー表示では、今日以降の未記録日をまたいで
 * 「直近の継続中ストリーク」を薄表示するための補助関数も提供する。
 */

import {isDateMatchingRRule} from './recurrence';
import {getPeriodRange, getCompletedCountInPeriod} from './period';
import type {GoalPeriod} from '@/types/database';

export interface StreakLogEntry {
  target_date: string; // 'YYYY-MM-DD'
  status: 'completed' | 'skipped';
}

export interface StreakHabitInfo {
  recurrence_rule: string | null;
  start_date: string;
  end_date?: string | null;
  goal_period?: GoalPeriod;
  goal_value?: number;
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

function atStartOfDay(date: Date): Date {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
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
 * 週/月単位のストリーク計算
 * 連続する期間で goal_value 以上の completed がある期間をカウント
 *
 * previewPending=true の場合、今期が未達成でもスキップして
 * 前の期間からストリークを計算する（Today 画面のプレビュー用）
 */
function calculatePeriodStreak(
  logs: StreakLogEntry[],
  habit: StreakHabitInfo,
  today?: string,
  weekStart: number = 1,
  previewPending: boolean = false,
): StreakResult {
  const goalPeriod = habit.goal_period!;
  const goalValue = habit.goal_value ?? 1;

  const currentDate = today
    ? new Date(today + 'T00:00:00')
    : new Date();
  currentDate.setHours(0, 0, 0, 0);

  // end_date が過去なら end_date から開始
  if (habit.end_date) {
    const endDate = new Date(habit.end_date + 'T00:00:00');
    endDate.setHours(0, 0, 0, 0);
    if (endDate < currentDate) {
      currentDate.setTime(endDate.getTime());
    }
  }

  let streak = 0;
  let fromDate: string | null = null;
  let periodsChecked = 0;
  const maxPeriods = goalPeriod === 'weekly' ? 5200 : 1200; // ~100 years

  // 現在の期間から過去方向に走査
  let checkDate = formatDate(currentDate);

  while (periodsChecked < maxPeriods) {
    const range = getPeriodRange(checkDate, goalPeriod, weekStart);

    // 期間の開始が habit の start_date より前なら終了
    if (range.end < habit.start_date) break;

    const completedCount = getCompletedCountInPeriod(logs, range.start, range.end);

    if (completedCount >= goalValue) {
      streak++;
      fromDate = range.start;
    } else if (previewPending && periodsChecked === 0) {
      // プレビューモード: 今期が未達成でもスキップして前の期間へ
      // (最初の期間のみスキップ)
    } else {
      // 目標未達 → ストリーク切れ
      break;
    }

    // 前の期間へ移動
    const prevDate = new Date(range.start + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);
    checkDate = formatDate(prevDate);
    periodsChecked++;
  }

  return {count: streak, from: streak > 0 ? fromDate : null};
}

/**
 * 単一習慣のストリーク計算
 */
export function calculateStreak(
  logs: StreakLogEntry[],
  habit: StreakHabitInfo,
  today?: string,
  weekStart: number = 1,
  previewPending: boolean = false,
): StreakResult {
  // 週/月単位の習慣は期間ベースの計算を使用
  if (habit.goal_period && habit.goal_period !== 'daily') {
    return calculatePeriodStreak(logs, habit, today, weekStart, previewPending);
  }

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
 * Today 画面向けの表示用ストリーク計算
 *
 * selectedDate が今日以降で、かつその日にまだログがない場合は、
 * 未記録の対象日を現在日まで遡ってスキップし、直近の継続中ストリークを返す。
 */
export function calculateDisplayStreak(
  logs: StreakLogEntry[],
  habit: StreakHabitInfo,
  selectedDate: string,
  actualToday?: string,
  weekStart: number = 1,
): StreakResult {
  // weekly/monthly 習慣: previewPending=true で期間ストリーク計算
  if (habit.goal_period && habit.goal_period !== 'daily') {
    return calculateStreak(logs, habit, selectedDate, weekStart, true);
  }

  // daily 習慣: 既存ロジック（未記録日をスキップして直近のログまで巻き戻す）
  const logMap = new Map<string, 'completed' | 'skipped'>();
  for (const log of logs) {
    logMap.set(log.target_date, log.status);
  }

  const currentDate = atStartOfDay(
    actualToday ? new Date(actualToday + 'T00:00:00') : new Date(),
  );
  const previewDate = atStartOfDay(new Date(selectedDate + 'T00:00:00'));
  const startDate = atStartOfDay(new Date(habit.start_date + 'T00:00:00'));

  if (habit.end_date) {
    const endDate = atStartOfDay(new Date(habit.end_date + 'T00:00:00'));
    if (endDate < previewDate) {
      previewDate.setTime(endDate.getTime());
    }
  }

  while (previewDate >= currentDate && previewDate >= startDate) {
    const dateStr = formatDate(previewDate);
    if (!isScheduledDate(previewDate, habit)) {
      subtractOneDay(previewDate);
      continue;
    }

    if (logMap.has(dateStr)) {
      break;
    }

    subtractOneDay(previewDate);
  }

  return calculateStreak(logs, habit, formatDate(previewDate));
}

/**
 * 複数習慣のストリーク一括計算
 */
export function calculateStreaks(
  logsByHabit: Record<string, StreakLogEntry[]>,
  habits: Record<string, StreakHabitInfo>,
  today?: string,
  weekStart: number = 1,
): Record<string, StreakResult> {
  const result: Record<string, StreakResult> = {};

  for (const habitId of Object.keys(habits)) {
    const logs = logsByHabit[habitId] ?? [];
    result[habitId] = calculateStreak(logs, habits[habitId], today, weekStart);
  }

  return result;
}
