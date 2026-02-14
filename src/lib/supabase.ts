import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Expo 環境変数を取得
// .env の EXPO_PUBLIC_* は expo-constants 経由でアクセス
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  'http://localhost:54321';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
