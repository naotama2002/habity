import { describe, expect, it } from '@jest/globals';
import { initialSessionState, SessionState } from '../types';

/**
 * Session 型定義と初期状態のテスト
 * Bluesky の session-test.ts を参考に設計
 */
describe('session types', () => {
  describe('initialSessionState', () => {
    it('should have correct initial values', () => {
      expect(initialSessionState).toEqual({
        session: null,
        user: null,
        hasSession: false,
        isLoading: true,
        isInitialized: false,
      });
    });

    it('should not have a session initially', () => {
      expect(initialSessionState.hasSession).toBe(false);
      expect(initialSessionState.session).toBeNull();
      expect(initialSessionState.user).toBeNull();
    });

    it('should be loading initially', () => {
      expect(initialSessionState.isLoading).toBe(true);
    });

    it('should not be initialized initially', () => {
      expect(initialSessionState.isInitialized).toBe(false);
    });
  });

  describe('SessionState type', () => {
    it('should accept valid state with session', () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: Date.now() + 3600,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'test@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
        },
      };

      const mockUser = {
        id: 'user-123',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      };

      const stateWithSession: SessionState = {
        session: mockSession as any,
        user: mockUser as any,
        hasSession: true,
        isLoading: false,
        isInitialized: true,
      };

      expect(stateWithSession.hasSession).toBe(true);
      expect(stateWithSession.session).not.toBeNull();
      expect(stateWithSession.user).not.toBeNull();
      expect(stateWithSession.isLoading).toBe(false);
      expect(stateWithSession.isInitialized).toBe(true);
    });

    it('should accept valid state without session', () => {
      const stateWithoutSession: SessionState = {
        session: null,
        user: null,
        hasSession: false,
        isLoading: false,
        isInitialized: true,
      };

      expect(stateWithoutSession.hasSession).toBe(false);
      expect(stateWithoutSession.session).toBeNull();
      expect(stateWithoutSession.user).toBeNull();
      expect(stateWithoutSession.isLoading).toBe(false);
      expect(stateWithoutSession.isInitialized).toBe(true);
    });
  });
});
