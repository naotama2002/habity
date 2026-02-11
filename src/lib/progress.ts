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
  const completedCount = habits.filter(h => h.is_completed).length;
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
