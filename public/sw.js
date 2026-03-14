// ============================================================
// Habity Service Worker
// ============================================================
// Push 通知の受信とバッジ表示を処理する。
// キャッシュ戦略は含まない（Expo Web のバンドルに依存）。
// ============================================================

// 即座にアクティブ化
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push 通知を受信
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, badgeCount } = data;

  const options = {
    body: body,
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: { url: '/' },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title || 'Habity', options),
      // バッジ表示（対応ブラウザのみ）
      navigator.setAppBadge && badgeCount > 0
        ? navigator.setAppBadge(badgeCount)
        : Promise.resolve(),
    ]),
  );
});

// 通知クリック時にアプリにフォーカス
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // なければ新規ウィンドウを開く
      return self.clients.openWindow(url);
    }),
  );
});
