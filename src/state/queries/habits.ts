import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  Habit,
  HabitWithTodayLog,
  CreateHabitInput,
  UpdateHabitInput,
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
      const { data, error } = await supabase
        .from('habits_with_today_log')
        .select('*')
        .eq('status', 'active')
        .order('sort_order');

      if (error) throw error;
      return data as HabitWithTodayLog[];
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
