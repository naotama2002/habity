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
    signUpWithEmail: jest.fn(),
  })),
}));

// expo-router モック
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({replace: mockReplace, back: mockBack})),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// config モック用変数
let mockEnableSignup = true;
jest.mock('@/lib/config', () => ({
  get config() {
    return {enableSignup: mockEnableSignup};
  },
}));

import SignupScreen from '../signup';

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableSignup = true;
  });

  it('should render signup form when signup is enabled', () => {
    mockEnableSignup = true;
    render(<SignupScreen />);
    expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
  });

  it('should redirect to welcome when signup is disabled', () => {
    mockEnableSignup = false;
    render(<SignupScreen />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/welcome');
  });
});
