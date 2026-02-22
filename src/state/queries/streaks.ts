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

/** Supabase のデフォルト行数制限 */
const PAGE_SIZE = 1000;

/**
 * Supabase の 1000 行制限を超えるデータをページネーションで全件取得
 */
async function fetchAllHabitLogs(
  habitIds: string[],
  fromDate: string,
  today: string,
) {
  const allRows: {habit_id: string; target_date: string; status: string}[] = [];
  let rangeStart = 0;
  let hasMore = true;

  while (hasMore) {
    const {data, error} = await supabase
      .from('habit_logs')
      .select('habit_id, target_date, status')
      .in('habit_id', habitIds)
      .gte('target_date', fromDate)
      .lte('target_date', today)
      .order('target_date', {ascending: false})
      .range(rangeStart, rangeStart + PAGE_SIZE - 1);

    if (error) throw error;

    allRows.push(...(data ?? []));

    // 返却行数が PAGE_SIZE 未満なら全件取得済み
    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      rangeStart += PAGE_SIZE;
    }
  }

  return allRows;
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
      const rows = await fetchAllHabitLogs(habitIds, fromDate, today);

      // habit_id ごとにログをグルーピング
      const logsByHabit: Record<string, StreakLogEntry[]> = {};
      for (const row of rows) {
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
