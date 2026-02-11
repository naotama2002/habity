import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {render, screen} from '@testing-library/react-native';

// SafeAreaView をモック
jest.mock('react-native-safe-area-context', () => {
  const inset = {top: 0, right: 0, bottom: 0, left: 0};
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
    SafeAreaView: ({children}: {children: React.ReactNode}) => (
      <View>{children}</View>
    ),
    useSafeAreaInsets: () => inset,
  };
});

// Session モック
jest.mock('@/state/session', () => ({
  useSessionApi: jest.fn(() => ({
    signInWithGoogle: jest.fn(),
  })),
}));

// config モック用変数
let mockEnableSignup = true;
jest.mock('@/lib/config', () => ({
  get config() {
    return {enableSignup: mockEnableSignup};
  },
}));

import WelcomeScreen from '../welcome';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableSignup = true;
  });

  it('should show sign up link when signup is enabled', () => {
    mockEnableSignup = true;
    render(<WelcomeScreen />);
    expect(screen.getByText(/Sign Up/)).toBeTruthy();
  });

  it('should hide sign up link when signup is disabled', () => {
    mockEnableSignup = false;
    render(<WelcomeScreen />);
    expect(screen.queryByText(/Sign Up/)).toBeNull();
  });

  it('should always show sign in buttons regardless of signup setting', () => {
    mockEnableSignup = false;
    render(<WelcomeScreen />);
    expect(screen.getByText('Sign in with Google')).toBeTruthy();
    expect(screen.getByText('Sign in with Email')).toBeTruthy();
  });
});
