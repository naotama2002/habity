-- ============================================================
-- notifications_enabled のデフォルト値を false に変更
-- Push 通知はユーザーが明示的に有効にするまで OFF
-- ============================================================

ALTER TABLE user_settings
  ALTER COLUMN notifications_enabled SET DEFAULT false;
