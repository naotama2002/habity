import { Platform } from 'react-native';

/**
 * Service Worker を登録する。
 * Web 環境でのみ動作し、非対応環境では null を返す。
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * アクティブな Service Worker Registration を取得する。
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * アプリバッジをクリアする。
 * Badging API 対応ブラウザでのみ動作。
 */
export async function clearAppBadge(): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    if ('clearAppBadge' in navigator) {
      await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  } catch {
    // Badging API 非対応の場合は無視
  }
}
