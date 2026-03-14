import { Platform } from 'react-native';

// Supabase モック（localStorage が未定義のため）
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import {
  isPushSupported,
  getPermissionState,
  urlBase64ToUint8Array,
} from '../push-notifications';

describe('push-notifications', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, writable: true });
  });

  describe('isPushSupported', () => {
    it('returns false when not on web platform', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      expect(isPushSupported()).toBe(false);
    });

    it('returns false when PushManager is not available', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(isPushSupported()).toBe(false);
    });

    it('returns true when PushManager and Notification are available', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(globalThis, 'window', {
        value: { PushManager: {}, Notification: {} },
        writable: true,
        configurable: true,
      });
      // Ensure global Notification is also set
      Object.defineProperty(globalThis, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      expect(isPushSupported()).toBe(true);
    });
  });

  describe('getPermissionState', () => {
    it('returns null when push is not supported', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      expect(getPermissionState()).toBeNull();
    });

    it('returns current Notification.permission', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(globalThis, 'window', {
        value: { PushManager: {}, Notification: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });
      expect(getPermissionState()).toBe('granted');
    });
  });

  describe('urlBase64ToUint8Array', () => {
    it('converts a base64url string to Uint8Array', () => {
      // Known VAPID key fragment for testing
      const base64 = 'AAAA';
      const result = urlBase64ToUint8Array(base64);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
    });

    it('handles base64url characters (- and _)', () => {
      // '-' should map to '+', '_' should map to '/'
      const base64url = 'ab-c_d';
      const result = urlBase64ToUint8Array(base64url);
      expect(result).toBeInstanceOf(Uint8Array);
      // 'ab+c/d' in standard base64 = 3 bytes after padding
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles padding correctly', () => {
      // 1 char -> needs 3 padding
      const result1 = urlBase64ToUint8Array('QQ');
      expect(result1).toBeInstanceOf(Uint8Array);
      expect(result1[0]).toBe(65); // 'A'

      // 2 chars -> needs 2 padding
      const result2 = urlBase64ToUint8Array('QUI');
      expect(result2).toBeInstanceOf(Uint8Array);
      expect(result2[0]).toBe(65); // 'A'
      expect(result2[1]).toBe(66); // 'B'
    });
  });
});
