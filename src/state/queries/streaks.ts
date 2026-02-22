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
      console.log('[streaks] queryFn called', {habitCount: habitIds.length, today, fromDate});

      const {data, error} = await supabase
        .from('habit_logs')
        .select('habit_id, target_date, status')
        .in('habit_id', habitIds)
        .gte('target_date', fromDate)
        .lte('target_date', today);

      if (error) {
        console.error('[streaks] Supabase error', error);
        throw error;
      }

      console.log('[streaks] Supabase rows:', data?.length ?? 0);

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

      const result = calculateStreaks(logsByHabit, habits, today);
      const nonZero = Object.entries(result).filter(([, v]) => v.count > 0);
      console.log('[streaks] result:', {total: Object.keys(result).length, nonZero: nonZero.length, samples: nonZero.slice(0, 3)});

      return result;
    },
    enabled: habitIds.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
