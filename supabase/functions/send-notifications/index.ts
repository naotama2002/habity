// ============================================================
// send-notifications Edge Function
// ============================================================
// Cloudflare Workers Cron から毎分呼び出される。
// 1. get_users_to_notify RPC で通知対象ユーザーを取得
// 2. 各ユーザーの残り習慣数を計算
// 3. 残り > 0 の場合のみ Web Push 通知を送信
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@habity.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================
// Web Push 署名（RFC 8292 VAPID）
// ============================================================

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

async function importVapidKeys() {
  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);

  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    [],
  );

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    convertRawToPKCS8(privateKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );

  return { publicKey, privateKey, publicKeyBytes };
}

function convertRawToPKCS8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 header for P-256 ECDSA
  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(header.length + rawKey.length);
  result.set(header);
  result.set(rawKey, header.length);
  return result.buffer;
}

async function createVapidJwt(
  audience: string,
  privateKey: CryptoKey,
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(unsigned),
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const signatureBytes = derToRaw(new Uint8Array(signature));
  const signatureB64 = base64UrlEncode(signatureBytes);

  return `${unsigned}.${signatureB64}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's already raw
  if (der.length === 64) return der;

  // DER format: 0x30 <total_len> 0x02 <r_len> <r> 0x02 <s_len> <s>
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 <total_len>

  // Read r
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // Read s
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);

  return raw;
}

// ============================================================
// Web Push 暗号化 (RFC 8291 - aes128gcm)
// ============================================================

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey),
  );

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    base64UrlDecode(p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subscriberPublicKey },
      localKeyPair.privateKey,
      256,
    ),
  );

  const authBytes = base64UrlDecode(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive PRK
  const ikm = await hkdfExtract(sharedSecret, authBytes);
  const prk = await hkdfExpand(ikm, concatBuffers(
    encoder.encode('WebPush: info\0'),
    base64UrlDecode(p256dh),
    localPublicKey,
    new Uint8Array([1]),
  ), 32);

  // Derive CEK and nonce via HKDF with salt
  const keyMaterial = await hkdfExtract(prk, salt);
  const cek = (await hkdfExpand(keyMaterial, concatBuffers(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])), 16));
  const nonce = (await hkdfExpand(keyMaterial, concatBuffers(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([1])), 12));

  // Pad payload: add 0x02 delimiter
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload),
  );

  return { encrypted, salt, localPublicKey };
}

async function hkdfExtract(ikm: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', key, info));
  return result.slice(0, length);
}

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
): Promise<Response> {
  const { privateKey, publicKeyBytes } = await importVapidKeys();

  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJwt(audience, privateKey);
  const payloadStr = JSON.stringify(payload);

  const { encrypted, salt, localPublicKey } = await encryptPayload(payloadStr, p256dh, auth);

  // Build aes128gcm content:
  // salt (16) + rs (4) + idlen (1) + keyid (65) + encrypted
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concatBuffers(salt, rs, new Uint8Array([65]), localPublicKey);
  const body = concatBuffers(header, encrypted);

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(body.length),
      Authorization: `vapid t=${jwt}, k=${base64UrlEncode(publicKeyBytes)}`,
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  });
}

// ============================================================
// 残り習慣数の計算
// ============================================================

async function getRemainingHabitsCount(
  userId: string,
  timezone: string,
): Promise<number> {
  const now = new Date();
  // ユーザーのタイムゾーンで今日の日付を取得
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });

  // アクティブな習慣を取得
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, recurrence_rule, start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (habitsError || !habits) return 0;

  // 今日のログを取得
  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('target_date', todayStr);

  if (logsError) return 0;

  const completedHabitIds = new Set((logs || []).map((l: { habit_id: string }) => l.habit_id));

  // 今日がスケジュール対象日で、まだ完了していない習慣をカウント
  let remaining = 0;
  for (const habit of habits) {
    // start_date チェック
    if (habit.start_date > todayStr) continue;
    // end_date チェック
    if (habit.end_date && habit.end_date < todayStr) continue;
    // 既に完了済み
    if (completedHabitIds.has(habit.id)) continue;

    // RRULE チェック（DB 関数を利用）
    if (habit.recurrence_rule) {
      const { data: isScheduled } = await supabase.rpc('_is_scheduled_date', {
        check_date: todayStr,
        rrule: habit.recurrence_rule,
        habit_start: habit.start_date,
      });
      if (!isScheduled) continue;
    }

    remaining++;
  }

  return remaining;
}

// ============================================================
// 通知メッセージ生成
// ============================================================

function buildNotificationPayload(
  remainingCount: number,
  locale: string,
): object {
  const body =
    locale === 'ja'
      ? `残り${remainingCount}個の習慣があります！`
      : `You have ${remainingCount} habits remaining!`;

  return {
    title: 'Habity',
    body,
    badgeCount: remainingCount,
  };
}

// ============================================================
// メインハンドラ
// ============================================================

Deno.serve(async (req) => {
  // POST のみ許可（Cron からの呼び出し）
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Authorization ヘッダーの簡易チェック
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 通知対象ユーザーを取得
    const { data: users, error } = await supabase.rpc('get_users_to_notify');
    if (error) {
      console.error('Failed to get users to notify:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      // 残り習慣数を計算
      const remaining = await getRemainingHabitsCount(user.user_id, user.timezone);
      if (remaining === 0) continue;

      // Push subscription を取得
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', user.user_id);

      if (!subscriptions) continue;

      const payload = buildNotificationPayload(remaining, user.locale);

      for (const sub of subscriptions) {
        try {
          const response = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, payload);

          if (response.ok) {
            sentCount++;
          } else if (response.status === 410 || response.status === 404) {
            // Subscription が無効 → 削除
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`Deleted stale subscription: ${sub.id}`);
          } else {
            console.error(`Push failed (${response.status}): ${await response.text()}`);
            errorCount++;
          }
        } catch (err) {
          console.error(`Push error for subscription ${sub.id}:`, err);
          errorCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        errors: errorCount,
        usersChecked: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
