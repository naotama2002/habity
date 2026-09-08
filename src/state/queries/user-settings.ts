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
      // getUser() はネットワーク往復を伴い GoTrue のロックで直列化される。
      // ローカルのセッションで足りるため getSession() を使う。
      const {
        data: {session},
      } = await supabase.auth.getSession();
      const user = session?.user;
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
