import { Platform } from 'react-native';
import {
  registerServiceWorker,
  getServiceWorkerRegistration,
  clearAppBadge,
} from '../service-worker';

describe('service-worker', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, writable: true });
    jest.restoreAllMocks();
  });

  describe('registerServiceWorker', () => {
    it('returns null when not on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const result = await registerServiceWorker();
      expect(result).toBeNull();
    });

    it('returns null when serviceWorker is not supported', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const result = await registerServiceWorker();
      expect(result).toBeNull();
    });

    it('calls navigator.serviceWorker.register with /sw.js', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const mockRegistration = { scope: '/' } as unknown as ServiceWorkerRegistration;
      const mockRegister = jest.fn().mockResolvedValue(mockRegistration);
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: { register: mockRegister } },
        writable: true,
        configurable: true,
      });
      const result = await registerServiceWorker();
      expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      expect(result).toBe(mockRegistration);
    });

    it('returns null if registration fails', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const mockRegister = jest.fn().mockRejectedValue(new Error('fail'));
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: { register: mockRegister } },
        writable: true,
        configurable: true,
      });
      const result = await registerServiceWorker();
      expect(result).toBeNull();
    });
  });

  describe('getServiceWorkerRegistration', () => {
    it('returns null when not on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const result = await getServiceWorkerRegistration();
      expect(result).toBeNull();
    });

    it('returns null when serviceWorker is not supported', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const result = await getServiceWorkerRegistration();
      expect(result).toBeNull();
    });

    it('returns registration from navigator.serviceWorker.ready', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const mockRegistration = { scope: '/' } as unknown as ServiceWorkerRegistration;
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: { ready: Promise.resolve(mockRegistration) } },
        writable: true,
        configurable: true,
      });
      const result = await getServiceWorkerRegistration();
      expect(result).toBe(mockRegistration);
    });
  });

  describe('clearAppBadge', () => {
    it('does nothing when not on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      await expect(clearAppBadge()).resolves.toBeUndefined();
    });

    it('calls navigator.clearAppBadge when available', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const mockClearAppBadge = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, 'navigator', {
        value: { clearAppBadge: mockClearAppBadge },
        writable: true,
        configurable: true,
      });
      await clearAppBadge();
      expect(mockClearAppBadge).toHaveBeenCalled();
    });

    it('does nothing when clearAppBadge is not available', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      await expect(clearAppBadge()).resolves.toBeUndefined();
    });
  });
});
