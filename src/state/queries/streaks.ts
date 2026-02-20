import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/lib/supabase';
import {calculateStreaks} from '@/lib/streak';
import type {StreakLogEntry, StreakHabitInfo} from '@/lib/streak';

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

export function useHabitStreaks(
  habitIds: string[],
  habits: Record<string, StreakHabitInfo>,
) {
  const today = new Date().toISOString().split('T')[0];
  const from = new Date();
  from.setDate(from.getDate() - 365);
  const fromDate = from.toISOString().split('T')[0];

  return useQuery({
    queryKey: streakKeys.byHabits(habitIds),
    queryFn: async () => {
      const {data, error} = await supabase
        .from('habit_logs')
        .select('habit_id, target_date, status')
        .in('habit_id', habitIds)
        .gte('target_date', fromDate)
        .lte('target_date', today);

      if (error) throw error;

      // habit_id ごとにログをグルーピング
      const logsByHabit: Record<string, StreakLogEntry[]> = {};
      for (const row of data ?? []) {
        if (!logsByHabit[row.habit_id]) {
          logsByHabit[row.habit_id] = [];
        }
        logsByHabit[row.habit_id].push({
          target_date: row.target_date,
          status: row.status as 'completed' | 'skipped',
        });
      }

      return calculateStreaks(logsByHabit, habits, today);
    },
    enabled: habitIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
