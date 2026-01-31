import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { habitKeys } from './habits';
import type { HabitLog, CreateHabitLogInput } from '@/types/database';

// ===========================================
// Query Keys
// ===========================================

export const habitLogKeys = {
  all: ['habit-logs'] as const,
  lists: () => [...habitLogKeys.all, 'list'] as const,
  list: (habitId: string, filters?: { from?: string; to?: string }) =>
    [...habitLogKeys.lists(), habitId, filters] as const,
  byDate: (date: string) => [...habitLogKeys.all, 'date', date] as const,
};

// ===========================================
// Queries
// ===========================================

export function useHabitLogs(
  habitId: string,
  options?: { from?: string; to?: string }
) {
  return useQuery({
    queryKey: habitLogKeys.list(habitId, options),
    queryFn: async () => {
      let query = supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .order('target_date', { ascending: false });

      if (options?.from) {
        query = query.gte('target_date', options.from);
      }
      if (options?.to) {
        query = query.lte('target_date', options.to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HabitLog[];
    },
    enabled: !!habitId,
  });
}

export function useLogsByDate(date: string) {
  return useQuery({
    queryKey: habitLogKeys.byDate(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('target_date', date);

      if (error) throw error;
      return data as HabitLog[];
    },
  });
}

// ===========================================
// Mutations
// ===========================================

export function useCreateHabitLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHabitLogInput) => {
      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('認証が必要です');
      }

      const { data, error } = await supabase
        .from('habit_logs')
        .insert({
          ...input,
          completed_at: input.completed_at || new Date().toISOString(),
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as HabitLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: habitLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitLogKeys.byDate(data.target_date) });
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
    },
  });
}

export function useUpdateHabitLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      value,
      note,
    }: {
      id: string;
      value?: number;
      note?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('habit_logs')
        .update({ value, note })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HabitLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: habitLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitLogKeys.byDate(data.target_date) });
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
    },
  });
}

export function useDeleteHabitLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the log first to know the target_date
      const { data: log } = await supabase
        .from('habit_logs')
        .select('target_date')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return log?.target_date;
    },
    onSuccess: (targetDate) => {
      queryClient.invalidateQueries({ queryKey: habitLogKeys.lists() });
      if (targetDate) {
        queryClient.invalidateQueries({ queryKey: habitLogKeys.byDate(targetDate) });
      }
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
    },
  });
}

// ===========================================
// Toggle Habit (Complete/Uncomplete)
// ===========================================

export function useToggleHabitLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      targetDate,
      currentLogId,
      value = 1,
    }: {
      habitId: string;
      targetDate: string;
      currentLogId?: string | null;
      value?: number;
    }) => {
      if (currentLogId) {
        // Delete existing log (uncomplete)
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', currentLogId);

        if (error) throw error;
        return null;
      } else {
        // Create new log (complete)
        // 現在のユーザーIDを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('認証が必要です');
        }

        const { data, error } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            target_date: targetDate,
            value,
            completed_at: new Date().toISOString(),
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data as HabitLog;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.today() });
    },
  });
}
