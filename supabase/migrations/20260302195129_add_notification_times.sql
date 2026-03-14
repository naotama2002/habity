-- ============================================================
-- notification_times カラムを user_settings に追加
-- 複数の通知時刻を保持（最大5件）
-- ============================================================

ALTER TABLE user_settings
  ADD COLUMN notification_times TIME[] DEFAULT '{08:00}';

-- 既存の daily_reminder_time からデータ移行
UPDATE user_settings
  SET notification_times = ARRAY[daily_reminder_time::TIME]
  WHERE daily_reminder_time IS NOT NULL;

-- 最大5件の制約
ALTER TABLE user_settings
  ADD CONSTRAINT chk_notification_times_max_5
  CHECK (array_length(notification_times, 1) IS NULL OR array_length(notification_times, 1) <= 5);
