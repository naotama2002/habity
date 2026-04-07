import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/lib/supabase';
import type {UserSettings} from '@/types/database';

// ===========================================
// Query Keys
// ===========================================

export const userSettingsKeys = {
  all: ['user-settings'] as const,
  detail: () => [...userSettingsKeys.all, 'detail'] as const,
};

// ===========================================
// Queries
// ===========================================

export function useUserSettings() {
  return useQuery({
    queryKey: userSettingsKeys.detail(),
    queryFn: async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) throw new Error('認証が必要です');

      const {data, error} = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * week_start のみを返す便利フック
 * デフォルト値: 1 (月曜)
 */
export function useWeekStart(): number {
  const {data} = useUserSettings();
  return data?.week_start ?? 1;
}
