import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isDateMatchingRRule } from '@/lib/recurrence';
import { getPeriodRange, getCompletedCountInPeriod } from '@/lib/period';
import type {
  Habit,
  HabitWithLog,
  CreateHabitInput,
  UpdateHabitInput,
  LogStatus,
} from '@/types/database';

// ===========================================
// Query Keys
// ===========================================

export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  list: (filters: { status?: string }) => [...habitKeys.lists(), filters] as const,
  details: () => [...habitKeys.all, 'detail'] as const,
  detail: (id: string) => [...habitKeys.details(), id] as const,
  byDate: (date: string) => [...habitKeys.all, 'byDate', date] as const,
};

// ===========================================
// Queries
// ===========================================

export function useHabits(status: string = 'active') {
  return useQuery({
    queryKey: habitKeys.list({ status }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('status', status)
        .order('sort_order');

      if (error) throw error;
      return data as Habit[];
    },
  });
}

export function useHabitsWithLog(date?: string, weekStart: number = 1) {
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: habitKeys.byDate(targetDate),
    queryFn: async () => {
      // habits テーブルを直接クエリ（RLS が効く）
      const {data: habits, error: habitsError} = await supabase
        .from('habits')
        .select('*')
        .eq('status', 'active')
        .order('sort_order');

      if (habitsError) throw habitsError;
      if (!habits || habits.length === 0) return [] as HabitWithLog[];

      // 指定日のログを取得（RLS が効く）
      const habitIds = habits.map(h => h.id);
      const {data: logs, error: logsError} = await supabase
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .eq('target_date', targetDate);

      if (logsError) throw logsError;

      // 非 daily 習慣の期間ログを取得
      const nonDailyHabits = habits.filter(h => h.goal_period !== 'daily');
      const periodLogMap = new Map<string, {target_date: string; status: string}[]>();

      if (nonDailyHabits.length > 0) {
        // 各期間タイプごとの最大期間範囲を計算
        const allRanges = nonDailyHabits.map(h =>
          getPeriodRange(targetDate, h.goal_period, weekStart),
        );
        const earliestStart = allRanges.reduce(
          (min, r) => (r.start < min ? r.start : min),
          allRanges[0].start,
        );
        const latestEnd = allRanges.reduce(
          (max, r) => (r.end > max ? r.end : max),
          allRanges[0].end,
        );

        const nonDailyIds = nonDailyHabits.map(h => h.id);
        const {data: periodLogs, error: periodLogsError} = await supabase
          .from('habit_logs')
          .select('habit_id, target_date, status')
          .in('habit_id', nonDailyIds)
          .gte('target_date', earliestStart)
          .lte('target_date', latestEnd);

        if (periodLogsError) throw periodLogsError;

        // habit_id ごとにグループ化
        for (const log of periodLogs ?? []) {
          const existing = periodLogMap.get(log.habit_id) ?? [];
          existing.push({target_date: log.target_date, status: log.status});
          periodLogMap.set(log.habit_id, existing);
        }
      }

      // 開始日・繰り返しルールに基づいてフィルタリング
      const targetDateObj = new Date(targetDate);
      const filteredHabits = habits.filter(h => {
        // 開始日より前の日付では表示しない
        if (targetDate < h.start_date) return false;
        // 終了日を超えた日付では表示しない（end_date当日は表示する）
        if (h.end_date && targetDate > h.end_date) return false;
        // daily 以外の習慣は recurrence_rule に関わらず期間中は毎日表示
        if (h.goal_period !== 'daily') return true;
        if (!h.recurrence_rule) return true;
        return isDateMatchingRRule(
          h.recurrence_rule,
          targetDateObj,
          new Date(h.start_date),
        );
      });

      // クライアント側で結合
      const logMap = new Map(logs?.map(l => [l.habit_id, l]) ?? []);

      return filteredHabits.map(h => {
        const log = logMap.get(h.id) ?? null;
        const logStatus: LogStatus | null = (log?.status as LogStatus) ?? null;

        // is_completed / is_skipped は常にその日のログで判定
        const isCompleted = log !== null && logStatus === 'completed';

        // 期間内の completed カウント（weekly/monthly 習慣用）
        let periodCompletedCount = 0;
        if (h.goal_period === 'daily') {
          periodCompletedCount = isCompleted ? 1 : 0;
        } else {
          const range = getPeriodRange(targetDate, h.goal_period, weekStart);
          const habitPeriodLogs = periodLogMap.get(h.id) ?? [];
          periodCompletedCount = getCompletedCountInPeriod(
            habitPeriodLogs,
            range.start,
            range.end,
          );
        }

        return {
          ...h,
          log_id: log?.id ?? null,
          log_value: log?.value ?? null,
          log_completed_at: log?.completed_at ?? null,
          log_note: log?.note ?? null,
          log_status: logStatus,
          is_completed: isCompleted,
          is_skipped: logStatus === 'skipped',
          period_completed_count: periodCompletedCount,
          is_period_completed: h.goal_period === 'daily'
            ? isCompleted
            : periodCompletedCount >= h.goal_value,
        } as HabitWithLog;
      });
    },
    placeholderData: keepPreviousData,
  });
}

/** @deprecated Use useHabitsWithLog */
export const useHabitsWithTodayLog = useHabitsWithLog;

export function useHabit(id: string) {
  return useQuery({
    queryKey: habitKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Habit;
    },
    enabled: !!id,
  });
}

// ===========================================
// Mutations
// ===========================================

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('認証が必要です');
      }

      const { data, error } = await supabase
        .from('habits')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateHabitInput & { id: string }) => {
      const { data, error } = await supabase
        .from('habits')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      queryClient.invalidateQueries({ queryKey: habitKeys.detail(data.id) });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useReorderHabits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase.from('habits').update({ sort_order }).eq('id', id),
      );
      const results = await Promise.all(promises);
      for (const result of results) {
        if (result.error) throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('habits')
        .update({ status: 'archived' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useUnarchiveHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('habits')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}
