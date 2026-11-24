import {useQuery, keepPreviousData} from '@tanstack/react-query';
import {supabase} from '@/lib/supabase';
import type {StreakResult} from '@/lib/streak';

export type {StreakResult};

// ===========================================
// Query Keys
// ===========================================

export const streakKeys = {
  all: ['streaks'] as const,
  byHabits: (habitIds: string[], referenceDate: string, previewPending: boolean) =>
    [
      ...streakKeys.all,
      'byHabits',
      referenceDate,
      previewPending ? 'preview' : 'strict',
      ...habitIds.sort(),
    ] as const,
};

// ===========================================
// Queries
// ===========================================


export function useHabitStreaks(
  habitIds: string[],
  // 描画中に new Date() を呼ばない (react/purity)。呼び出し側で日付を決める
  referenceDate: string,
  previewPending = false,
  weekStart = 1,
) {
  return useQuery({
    queryKey: streakKeys.byHabits(habitIds, referenceDate, previewPending),
    queryFn: async () => {
      const {data, error} = await supabase.rpc('calculate_streaks', {
        p_habit_ids: habitIds,
        p_today: referenceDate,
        p_preview_pending: previewPending,
        p_week_start: weekStart,
      });
      if (error) throw error;

      const result: Record<string, StreakResult> = {};
      // Initialize all habits with count=0
      for (const id of habitIds) {
        result[id] = {count: 0, from: null};
      }
      // Fill in results from RPC
      for (const row of data ?? []) {
        result[row.habit_id] = {
          count: row.streak_count,
          from: row.streak_from,
        };
      }
      return result;
    },
    enabled: habitIds.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
