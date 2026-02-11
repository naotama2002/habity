import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  Habit,
  HabitWithTodayLog,
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
  today: () => [...habitKeys.all, 'today'] as const,
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

export function useHabitsWithTodayLog() {
  return useQuery({
    queryKey: habitKeys.today(),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // habits テーブルを直接クエリ（RLS が効く）
      const {data: habits, error: habitsError} = await supabase
        .from('habits')
        .select('*')
        .eq('status', 'active')
        .order('sort_order');

      if (habitsError) throw habitsError;
      if (!habits || habits.length === 0) return [] as HabitWithTodayLog[];

      // 今日のログを取得（RLS が効く）
      const habitIds = habits.map(h => h.id);
      const {data: logs, error: logsError} = await supabase
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .eq('target_date', today);

      if (logsError) throw logsError;

      // クライアント側で結合
      const logMap = new Map(logs?.map(l => [l.habit_id, l]) ?? []);

      return habits.map(h => {
        const log = logMap.get(h.id) ?? null;
        const logStatus: LogStatus | null = (log?.status as LogStatus) ?? null;
        return {
          ...h,
          log_id: log?.id ?? null,
          log_value: log?.value ?? null,
          log_completed_at: log?.completed_at ?? null,
          log_note: log?.note ?? null,
          log_status: logStatus,
          is_completed_today: log !== null && logStatus === 'completed' && log.value >= h.goal_value,
          is_skipped_today: logStatus === 'skipped',
        } as HabitWithTodayLog;
      });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
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
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
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
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
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
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
    },
  });
}
