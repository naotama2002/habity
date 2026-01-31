import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import NewHabitScreen from '../new';

// Supabase をモック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null,
        })
      ),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: 'new-habit-id', name: 'Test Habit' },
              error: null,
            })
          ),
        })),
      })),
    })),
  },
}));

// SafeAreaView をモック
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => inset,
  };
});

describe('NewHabitScreen', () => {
  let queryClient: QueryClient;
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    // デフォルトは履歴ありでback()を使用
    mockRouter.canGoBack.mockReturnValue(true);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('should render screen with header', () => {
      renderWithProviders(<NewHabitScreen />);

      // Screen header (i18n mock returns English)
      expect(screen.getByText('New Habit')).toBeTruthy();
    });

    it('should render HabitForm', () => {
      renderWithProviders(<NewHabitScreen />);

      // i18n mock returns English strings
      expect(screen.getByText('Habit Name')).toBeTruthy();
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('should render close button in header', () => {
      renderWithProviders(<NewHabitScreen />);

      // Close icon should be rendered
      expect(screen.getByText('close')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should call router.back when close button is pressed and history exists', () => {
      renderWithProviders(<NewHabitScreen />);

      // Find and press the close button (parent pressable of the close icon)
      const closeIcon = screen.getByText('close');
      const closeButton = closeIcon.parent;
      if (closeButton) {
        fireEvent.press(closeButton);
      }

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should call router.replace when cancel button is pressed and no history', () => {
      mockRouter.canGoBack.mockReturnValue(false);
      renderWithProviders(<NewHabitScreen />);

      // i18n mock returns English
      fireEvent.press(screen.getByText('Cancel'));

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  describe('form submission', () => {
    it('should navigate back after successful submission when history exists', async () => {
      renderWithProviders(<NewHabitScreen />);

      // Fill in the form (i18n placeholder)
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Test Habit');

      // Submit (i18n button text)
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });

    it('should navigate to tabs after successful submission when no history', async () => {
      mockRouter.canGoBack.mockReturnValue(false);
      renderWithProviders(<NewHabitScreen />);

      // Fill in the form (i18n placeholder)
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Test Habit');

      // Submit (i18n button text)
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });
});
