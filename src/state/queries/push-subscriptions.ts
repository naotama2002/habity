import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-notifications';
import { getServiceWorkerRegistration } from '@/lib/service-worker';

// ===========================================
// Query Keys
// ===========================================

export const pushKeys = {
  all: ['push'] as const,
  status: () => [...pushKeys.all, 'status'] as const,
};

// ===========================================
// Types
// ===========================================

export interface PushStatus {
  /** ブラウザが Push 通知に対応しているか */
  isSupported: boolean;
  /** 通知許可の状態 */
  permission: NotificationPermission | null;
  /** Push subscription が登録済みか */
  isSubscribed: boolean;
}

// ===========================================
// Queries
// ===========================================

export function usePushStatus() {
  return useQuery({
    queryKey: pushKeys.status(),
    queryFn: async (): Promise<PushStatus> => {
      if (Platform.OS !== 'web') {
        return { isSupported: false, permission: null, isSubscribed: false };
      }

      const isSupported = isPushSupported();
      const permission = getPermissionState();

      let isSubscribed = false;
      if (isSupported && permission === 'granted') {
        const registration = await getServiceWorkerRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          isSubscribed = subscription !== null;
        }
      }

      return { isSupported, permission, isSubscribed };
    },
    staleTime: 30_000,
  });
}

// ===========================================
// Mutations
// ===========================================

export function useSubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subscribeToPush,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushKeys.status() });
    },
  });
}

export function useUnsubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unsubscribeFromPush,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushKeys.status() });
    },
  });
}
