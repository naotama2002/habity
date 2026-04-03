import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Expo 環境変数を取得
// .env の EXPO_PUBLIC_* は expo-constants 経由でアクセス
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  'http://localhost:54321';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
