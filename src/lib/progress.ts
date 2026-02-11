import type {HabitWithTodayLog} from '@/types/database';

/**
 * 今日の進捗を計算する
 * スキップした習慣は分母から除外
 */
export function calculateTodayProgress(habits: HabitWithTodayLog[]): {
  completedCount: number;
  skippedCount: number;
  totalCount: number;
  effectiveTotal: number;
  percentage: number;
} {
  const totalCount = habits.length;
  const completedCount = habits.filter(h => h.is_completed_today).length;
  const skippedCount = habits.filter(h => h.is_skipped_today).length;
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
