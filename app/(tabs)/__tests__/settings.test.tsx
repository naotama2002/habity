import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';

// i18n モック（.mjs インポートを回避）
jest.mock('@/locale/i18n', () => ({
  i18n: { locale: 'ja' },
}));

// Session モック用の変数
let mockUser: Record<string, unknown> | null = null;
const mockSignOut = jest.fn();

jest.mock('@/state/session', () => ({
  useSession: jest.fn(() => ({
    user: mockUser,
    hasSession: !!mockUser,
    session: null,
    isLoading: false,
    isInitialized: true,
  })),
  useSessionApi: jest.fn(() => ({
    signOut: mockSignOut,
  })),
}));

import SettingsScreen from '../settings';

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
  });

  describe('user info display', () => {
    it('should show email and username when logged in', () => {
      mockUser = {
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      render(<SettingsScreen />);

      expect(screen.getByText('Test User')).toBeTruthy();
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('should show email prefix as name when full_name is not set', () => {
      mockUser = {
        email: 'hello@example.com',
        user_metadata: {},
      };

      render(<SettingsScreen />);

      expect(screen.getByText('hello')).toBeTruthy();
      expect(screen.getByText('hello@example.com')).toBeTruthy();
    });

    it('should show fallback text when not logged in', () => {
      mockUser = null;

      render(<SettingsScreen />);

      expect(screen.getByText('Guest User')).toBeTruthy();
      expect(screen.getByText('Please sign in')).toBeTruthy();
    });
  });

  describe('sign out', () => {
    it('should call signOut from session API when sign out button is pressed', () => {
      mockUser = {
        email: 'test@example.com',
        user_metadata: {},
      };

      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
