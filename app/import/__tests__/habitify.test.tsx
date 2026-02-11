import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

// backend-api モック
const mockImportFromHabitify = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('@/lib/backend-api', () => ({
  importFromHabitify: (...args: unknown[]) => mockImportFromHabitify(...args),
}));

// SafeAreaView をモック
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    useSafeAreaInsets: () => inset,
  };
});

import HabitifyImportScreen from '../habitify';

describe('HabitifyImportScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(true);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should render the import form', () => {
    render(<HabitifyImportScreen />);

    expect(screen.getByText('Import from Habitify')).toBeTruthy();
    expect(screen.getByTestId('api-key-input')).toBeTruthy();
    expect(screen.getByTestId('import-habits-switch')).toBeTruthy();
    expect(screen.getByTestId('import-logs-switch')).toBeTruthy();
    expect(screen.getByTestId('import-button')).toBeTruthy();
  });

  it('should disable import button when API key is empty', () => {
    render(<HabitifyImportScreen />);

    const button = screen.getByTestId('import-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should enable import button when API key is entered', () => {
    render(<HabitifyImportScreen />);

    fireEvent.changeText(screen.getByTestId('api-key-input'), 'test-key');

    const button = screen.getByTestId('import-button');
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('should call importFromHabitify on button press', async () => {
    mockImportFromHabitify.mockResolvedValue({
      status: 'completed',
      habits_imported: 3,
      logs_imported: 50,
      errors: [],
    });

    render(<HabitifyImportScreen />);

    fireEvent.changeText(screen.getByTestId('api-key-input'), 'my-api-key');
    fireEvent.press(screen.getByTestId('import-button'));

    await waitFor(() => {
      expect(mockImportFromHabitify).toHaveBeenCalledWith({
        api_key: 'my-api-key',
        import_habits: true,
        import_logs: true,
        timezone: expect.any(String),
      });
    });
  });

  it('should show success view after import', async () => {
    mockImportFromHabitify.mockResolvedValue({
      status: 'completed',
      habits_imported: 5,
      logs_imported: 100,
      errors: [],
    });

    render(<HabitifyImportScreen />);

    fireEvent.changeText(screen.getByTestId('api-key-input'), 'my-api-key');
    fireEvent.press(screen.getByTestId('import-button'));

    await waitFor(() => {
      expect(screen.getByText('Import Complete')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
    });
  });

  it('should show error message on failure', async () => {
    mockImportFromHabitify.mockRejectedValue(
      new Error('Invalid Habitify API key'),
    );

    render(<HabitifyImportScreen />);

    fireEvent.changeText(screen.getByTestId('api-key-input'), 'bad-key');
    fireEvent.press(screen.getByTestId('import-button'));

    await waitFor(() => {
      expect(screen.getByText('Invalid Habitify API key')).toBeTruthy();
    });
  });

  it('should toggle import options', () => {
    render(<HabitifyImportScreen />);

    const habitsSwitch = screen.getByTestId('import-habits-switch');
    const logsSwitch = screen.getByTestId('import-logs-switch');

    // Both default to on
    expect(habitsSwitch.props.value).toBe(true);
    expect(logsSwitch.props.value).toBe(true);

    // Toggle habits off
    fireEvent(habitsSwitch, 'valueChange', false);
    expect(habitsSwitch.props.value).toBe(false);
  });
});
