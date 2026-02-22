import {useQuery, keepPreviousData} from '@tanstack/react-query';
import {supabase} from '@/lib/supabase';
import {calculateStreaks} from '@/lib/streak';
import type {StreakLogEntry, StreakHabitInfo, StreakResult} from '@/lib/streak';

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

export function useHabitStreaks(
  habitIds: string[],
  habits: Record<string, StreakHabitInfo>,
) {
  const today = formatLocalDate(new Date());
  const from = new Date();
  from.setDate(from.getDate() - 365);
  const fromDate = formatLocalDate(from);

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
    placeholderData: keepPreviousData,
  });
}
