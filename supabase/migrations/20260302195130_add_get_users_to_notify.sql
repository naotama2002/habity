-- ============================================================
-- get_users_to_notify: 現在通知を送るべきユーザーを取得
-- ============================================================
-- user_settings.notification_times と現在時刻（ユーザーのタイムゾーン）を比較し、
-- push_subscriptions が存在するユーザーのみ返す。
-- 1分間の時間窓で判定（HH:MM 完全一致）。
-- ============================================================

CREATE OR REPLACE FUNCTION get_users_to_notify()
RETURNS TABLE (
  user_id UUID,
  timezone TEXT,
  locale TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    us.user_id,
    us.timezone,
    us.locale
  FROM user_settings us
  INNER JOIN push_subscriptions ps ON ps.user_id = us.user_id
  WHERE us.notifications_enabled = true
    AND us.notification_times IS NOT NULL
    AND (NOW() AT TIME ZONE us.timezone)::TIME(0)
        = ANY(
          SELECT unnest(us.notification_times)::TIME(0)
        );
END;
$$;
