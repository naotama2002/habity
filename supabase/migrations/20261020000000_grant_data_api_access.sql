-- マイグレーション: Data API (PostgREST / supabase-js) 用の権限を明示的に付与
-- 説明: 2026-10-30 以降、Supabase は public スキーマの新規テーブルに
--       anon / authenticated / service_role への権限を自動付与しなくなる。
--       supabase db reset・新規プロジェクト・プレビューブランチでも
--       アプリが動くよう、既存テーブルの権限をここで明示する。
--       行単位のアクセス制御は各テーブルの RLS ポリシーで行う。
-- 参考: https://supabase.com/docs/guides/database/postgres/roles

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- categories
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;

-- habits
GRANT SELECT ON public.habits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO service_role;

-- habit_logs
GRANT SELECT ON public.habit_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO service_role;

-- user_settings
GRANT SELECT ON public.user_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO service_role;
