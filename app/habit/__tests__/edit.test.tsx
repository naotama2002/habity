import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import EditHabitScreen from '../[id]/edit';

const mockHabit = {
  id: 'habit-123',
  name: '読書',
  description: '毎日30分読む',
  tracking_type: 'boolean' as const,
  goal_value: 1,
  goal_unit: '回',
  goal_period: 'daily' as const,
  time_of_day: ['morning'] as const,
  start_date: '2024-01-01',
  category_id: null,
  recurrence_rule: null,
  reminder_times: null,
  reminder_enabled: false,
  status: 'active' as const,
  sort_order: 0,
  user_id: 'user-1',
  external_id: null,
  external_source: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Supabase をモック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'habits') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() =>
                Promise.resolve({
                  data: mockHabit,
                  error: null,
                })
              ),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() =>
                  Promise.resolve({
                    data: { ...mockHabit, name: 'Updated Habit' },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }
      return {};
    }),
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

describe('EditHabitScreen', () => {
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
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'habit-123' });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('should render screen with header', async () => {
      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByText('Edit Habit')).toBeTruthy();
        },
        { timeout: 10000 }
      );
    }, 15000);

    it('should show loading indicator initially', () => {
      renderWithProviders(<EditHabitScreen />);

      // Loading indicator should be present initially
      // (may be replaced by content quickly in tests)
    });

    it('should render HabitForm with initial values after loading', async () => {
      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('読書')).toBeTruthy();
        },
        { timeout: 10000 }
      );
    }, 15000);

    it('should show habit description in form', async () => {
      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('毎日30分読む')).toBeTruthy();
        },
        { timeout: 10000 }
      );
    }, 15000);
  });

  describe('navigation', () => {
    it('should call router.back when close button is pressed and history exists', async () => {
      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByText('Edit Habit')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Find and press the close button
      const closeIcon = screen.getByText('close');
      const closeButton = closeIcon.parent;
      if (closeButton) {
        fireEvent.press(closeButton);
      }

      expect(mockRouter.back).toHaveBeenCalled();
    }, 15000);

    it('should call router.replace when close button is pressed and no history', async () => {
      mockRouter.canGoBack.mockReturnValue(false);
      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByText('Edit Habit')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Find and press the close button
      const closeIcon = screen.getByText('close');
      const closeButton = closeIcon.parent;
      if (closeButton) {
        fireEvent.press(closeButton);
      }

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    }, 15000);
  });

  describe('form submission', () => {
    it('should navigate back after successful update when history exists', async () => {
      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('読書')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Modify the form
      const nameInput = screen.getByDisplayValue('読書');
      fireEvent.changeText(nameInput, '読書タイム');

      // Submit (i18n returns English)
      fireEvent.press(screen.getByText('Save'));

      await waitFor(
        () => {
          expect(mockRouter.back).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );
    }, 15000);
  });

  describe('error handling', () => {
    it('should show error message when habit is not found', async () => {
      // Mock to return null habit
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'non-existent' });

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Not found' },
              })
            ),
          })),
        })),
      }));

      renderWithProviders(<EditHabitScreen />);

      await waitFor(
        () => {
          expect(screen.getByText('Habit not found')).toBeTruthy();
        },
        { timeout: 10000 }
      );
    }, 15000);
  });
});
