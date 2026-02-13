import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isDateMatchingRRule } from '@/lib/recurrence';
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

export function useHabitsWithLog(date?: string) {
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

      // 開始日・繰り返しルールに基づいてフィルタリング
      const targetDateObj = new Date(targetDate);
      const filteredHabits = habits.filter(h => {
        // 開始日より前の日付では表示しない
        if (targetDate < h.start_date) return false;
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
        return {
          ...h,
          log_id: log?.id ?? null,
          log_value: log?.value ?? null,
          log_completed_at: log?.completed_at ?? null,
          log_note: log?.note ?? null,
          log_status: logStatus,
          is_completed: log !== null && logStatus === 'completed',
          is_skipped: logStatus === 'skipped',
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
