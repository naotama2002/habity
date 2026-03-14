// ============================================================
// Habity Notification Cron Worker
// ============================================================
// 毎分実行され、Supabase Edge Function (send-notifications) を
// HTTP POST で呼び出す。
// ============================================================

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(sendNotifications(env));
  },

  async fetch(
    _request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // 手動テスト用の HTTP エンドポイント
    ctx.waitUntil(sendNotifications(env));
    return new Response('Triggered send-notifications', { status: 200 });
  },
};

async function sendNotifications(env: Env): Promise<void> {
  const url = `${env.SUPABASE_URL}/functions/v1/send-notifications`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.text();
    console.log(`send-notifications response (${response.status}): ${result}`);
  } catch (error) {
    console.error('Failed to call send-notifications:', error);
  }
}
