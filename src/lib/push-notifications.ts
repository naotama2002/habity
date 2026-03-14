import { Platform } from 'react-native';
import { supabase } from './supabase';
import { config } from './config';
import { getServiceWorkerRegistration } from './service-worker';

/**
 * ブラウザが Push 通知に対応しているか
 */
export function isPushSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  return 'PushManager' in window && 'Notification' in window;
}

/**
 * 通知許可の現在の状態を取得
 */
export function getPermissionState(): NotificationPermission | null {
  if (!isPushSupported()) return null;
  return Notification.permission;
}

/**
 * Base64url 文字列を Uint8Array に変換（VAPID キー用）
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Push 通知を登録し、subscription を Supabase に保存する
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  const vapidPublicKey = config.vapidPublicKey;
  if (!vapidPublicKey) {
    console.warn('VAPID public key is not configured');
    return false;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userData.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'user_id,endpoint' },
  );

  if (error) {
    console.warn('Failed to save push subscription:', error);
    return false;
  }

  return true;
}

/**
 * Push 通知を解除し、Supabase から削除する
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return true;

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('endpoint', endpoint);

  return true;
}
