import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {ToastProvider} from '@/state/toast';
import type {HabitWithLog} from '@/types/database';

// i18n モック（.mjs インポートを回避）
jest.mock('@/locale/i18n', () => ({
  i18n: {locale: 'ja'},
}));

const mockHabit = {
  id: 'habit-1',
  user_id: 'user-1',
  name: 'ランニング',
  description: null,
  category_id: null,
  tracking_type: 'boolean',
  goal_value: 1,
  goal_unit: 'times',
  goal_period: 'daily',
  recurrence_rule: null,
  time_of_day: ['anytime'],
  reminder_times: null,
  reminder_enabled: false,
  start_date: '2024-01-01',
  end_date: null,
  status: 'active',
  sort_order: 0,
  external_id: null,
  external_source: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  log_id: null,
  log_value: null,
  log_completed_at: null,
  log_note: null,
  log_status: null,
  is_completed: false,
  is_skipped: false,
  period_completed_count: 0,
  is_period_completed: false,
} as unknown as HabitWithLog;

/** mutate(vars, options) の options.onError を必ず発火させる（＝失敗を再現） */
const mockFailingMutate = jest.fn(
  (_vars: unknown, options?: {onError?: (e: Error) => void}) => {
    options?.onError?.(new Error('boom'));
  },
);

jest.mock('@/state/queries/habits', () => ({
  useHabitsWithLog: jest.fn(() => ({
    data: [mockHabit],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    dataUpdatedAt: 1000,
  })),
  habitKeys: {all: ['habits']},
}));

jest.mock('@/state/queries/habit-logs', () => ({
  useToggleHabitLog: jest.fn(() => ({mutate: mockFailingMutate})),
  useSkipHabitLog: jest.fn(() => ({mutate: jest.fn()})),
  useUnskipHabitLog: jest.fn(() => ({mutate: jest.fn()})),
}));

jest.mock('@/state/queries/streaks', () => ({
  useHabitStreaks: jest.fn(() => ({data: {}})),
}));

jest.mock('@/state/queries/user-settings', () => ({
  useWeekStart: jest.fn(() => 1),
}));

import TodayScreen from '../index';

describe('Today 画面のエラー通知', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('チェックの更新に失敗したらトーストで通知する', () => {
    render(
      <ToastProvider>
        <TodayScreen />
      </ToastProvider>,
    );

    // 失敗前はトーストが無い
    expect(screen.queryByTestId('toast')).toBeNull();

    fireEvent.press(screen.getByTestId('habit-checkbox'));

    expect(mockFailingMutate).toHaveBeenCalledTimes(1);
    // i18n モックは英語メッセージを返す
    expect(
      screen.getByText('Failed to update the check. Please try again.'),
    ).toBeTruthy();
  });
});
