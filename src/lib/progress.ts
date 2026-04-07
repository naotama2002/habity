import type {HabitWithLog} from '@/types/database';

/**
 * 進捗を計算する
 * スキップした習慣は分母から除外
 */
export function calculateProgress(habits: HabitWithLog[]): {
  completedCount: number;
  skippedCount: number;
  totalCount: number;
  effectiveTotal: number;
  percentage: number;
} {
  const totalCount = habits.length;
  const completedCount = habits.filter(h => h.is_period_completed).length;
  const skippedCount = habits.filter(h => h.is_skipped).length;
  const effectiveTotal = totalCount - skippedCount;
  const percentage = effectiveTotal > 0 ? (completedCount / effectiveTotal) * 100 : 0;

  return {
    completedCount,
    skippedCount,
    totalCount,
    effectiveTotal,
    percentage,
  };
}

/** @deprecated Use calculateProgress */
export const calculateTodayProgress = calculateProgress;

/**
 * 未完了を先、完了・スキップを後に並べる（元の順序は維持）
 */
export function sortByCompletion(habits: HabitWithLog[]): HabitWithLog[] {
  const incomplete: HabitWithLog[] = [];
  const done: HabitWithLog[] = [];

  for (const habit of habits) {
    if (habit.is_period_completed || habit.is_skipped) {
      done.push(habit);
    } else {
      incomplete.push(habit);
    }
  }

  return [...incomplete, ...done];
}
