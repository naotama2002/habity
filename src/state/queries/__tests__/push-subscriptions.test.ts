import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Platform } from 'react-native';

// push-notifications モック
jest.mock('@/lib/push-notifications', () => ({
  isPushSupported: jest.fn(),
  getPermissionState: jest.fn(),
  subscribeToPush: jest.fn(),
  unsubscribeFromPush: jest.fn(),
}));

// service-worker モック
jest.mock('@/lib/service-worker', () => ({
  getServiceWorkerRegistration: jest.fn(),
}));

// React Query モック
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(
    (opts: { queryFn: () => Promise<unknown> }) => opts,
  ),
  useMutation: jest.fn(
    (opts: { mutationFn: () => Promise<unknown> }) => opts,
  ),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

import { useQuery } from '@tanstack/react-query';
import { isPushSupported, getPermissionState } from '@/lib/push-notifications';
import { getServiceWorkerRegistration } from '@/lib/service-worker';
import { pushKeys, usePushStatus, useSubscribePush, useUnsubscribePush } from '../push-subscriptions';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedIsPushSupported = isPushSupported as jest.MockedFunction<typeof isPushSupported>;
const mockedGetPermissionState = getPermissionState as jest.MockedFunction<typeof getPermissionState>;
const mockedGetSWRegistration = getServiceWorkerRegistration as jest.MockedFunction<typeof getServiceWorkerRegistration>;

describe('push-subscriptions queries', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, writable: true });
  });

  describe('pushKeys', () => {
    it('generates correct query keys', () => {
      expect(pushKeys.all).toEqual(['push']);
      expect(pushKeys.status()).toEqual(['push', 'status']);
    });
  });

  describe('usePushStatus', () => {
    function getQueryFn() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      usePushStatus();
      const call = mockedUseQuery.mock.calls[mockedUseQuery.mock.calls.length - 1];
      const opts = call[0] as unknown as { queryFn: () => Promise<unknown> };
      return opts.queryFn;
    }

    it('returns not supported when not on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const queryFn = getQueryFn();
      const result = await queryFn();
      expect(result).toEqual({
        isSupported: false,
        permission: null,
        isSubscribed: false,
      });
    });

    it('returns supported status with permission', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      mockedIsPushSupported.mockReturnValue(true);
      mockedGetPermissionState.mockReturnValue('granted');
      const mockSubscription = { endpoint: 'https://example.com' };
      mockedGetSWRegistration.mockResolvedValue({
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(mockSubscription),
        },
      } as unknown as ServiceWorkerRegistration);

      const queryFn = getQueryFn();
      const result = await queryFn();
      expect(result).toEqual({
        isSupported: true,
        permission: 'granted',
        isSubscribed: true,
      });
    });

    it('returns not subscribed when no subscription exists', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      mockedIsPushSupported.mockReturnValue(true);
      mockedGetPermissionState.mockReturnValue('granted');
      mockedGetSWRegistration.mockResolvedValue({
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(null),
        },
      } as unknown as ServiceWorkerRegistration);

      const queryFn = getQueryFn();
      const result = await queryFn();
      expect(result).toEqual({
        isSupported: true,
        permission: 'granted',
        isSubscribed: false,
      });
    });
  });

  describe('useSubscribePush', () => {
    it('creates a mutation', () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = useSubscribePush();
      expect(result).toBeDefined();
    });
  });

  describe('useUnsubscribePush', () => {
    it('creates a mutation', () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = useUnsubscribePush();
      expect(result).toBeDefined();
    });
  });
});
