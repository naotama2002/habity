import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserSettings } from '@/types/database';

// ===========================================
// Query Keys
// ===========================================

export const userSettingsKeys = {
  all: ['userSettings'] as const,
  detail: () => [...userSettingsKeys.all, 'detail'] as const,
};

// ===========================================
// Queries
// ===========================================

export function useUserSettings() {
  return useQuery({
    queryKey: userSettingsKeys.detail(),
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
  });
}

// ===========================================
// Mutations
// ===========================================

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userData.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSettingsKeys.detail() });
    },
  });
}
