import {useQuery, keepPreviousData} from '@tanstack/react-query';
import {supabase} from '@/lib/supabase';
import type {StreakResult} from '@/lib/streak';

export type {StreakResult};

// ===========================================
// Query Keys
// ===========================================

export const streakKeys = {
  all: ['streaks'] as const,
  byHabits: (habitIds: string[]) =>
    [...streakKeys.all, 'byHabits', ...habitIds.sort()] as const,
};

// ===========================================
// Queries
// ===========================================

/**
 * ローカルタイムゾーンの日付を 'YYYY-MM-DD' 形式で返す
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useHabitStreaks(habitIds: string[]) {
  return useQuery({
    queryKey: streakKeys.byHabits(habitIds),
    queryFn: async () => {
      const {data, error} = await supabase.rpc('calculate_streaks', {
        p_habit_ids: habitIds,
        p_today: formatLocalDate(new Date()),
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
