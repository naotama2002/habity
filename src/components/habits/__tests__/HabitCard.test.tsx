import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import {HabitCard} from '../HabitCard';
import type {HabitWithLog} from '@/types/database';

// expo-haptics モック
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {Light: 'light'},
}));

function createMockHabitWithLog(
  overrides: Partial<HabitWithLog> = {},
): HabitWithLog {
  return {
    id: 'habit-1',
    user_id: 'user-1',
    name: 'Test Habit',
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
    ...overrides,
  };
}

describe('HabitCard', () => {
  it('should render habit name', () => {
    const habit = createMockHabitWithLog({name: 'Morning Run'});
    render(<HabitCard habit={habit} />);
    expect(screen.getByText('Morning Run')).toBeTruthy();
  });

  it('should show checkmark when completed', () => {
    const habit = createMockHabitWithLog({
      is_completed: true,
      log_status: 'completed',
    });
    render(<HabitCard habit={habit} />);
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('should show skip mark when skipped', () => {
    const habit = createMockHabitWithLog({
      is_skipped: true,
      log_status: 'skipped',
    });
    render(<HabitCard habit={habit} />);
    expect(screen.getByText('⊘')).toBeTruthy();
  });

  it('should show "Skipped" label when skipped', () => {
    const habit = createMockHabitWithLog({
      is_skipped: true,
      log_status: 'skipped',
    });
    render(<HabitCard habit={habit} />);
    expect(screen.getByText('Skipped')).toBeTruthy();
  });

  it('should not show goal text for boolean tracking type', () => {
    const habit = createMockHabitWithLog({
      tracking_type: 'boolean',
      goal_value: 1,
      goal_unit: 'times',
    });
    render(<HabitCard habit={habit} />);
    // No goal progress text should be visible
    expect(screen.queryByText(/\/.*times/)).toBeNull();
  });

  it('should call onToggle when checkbox is pressed for non-skipped habit', async () => {
    const habit = createMockHabitWithLog();
    const onToggle = jest.fn();
    render(<HabitCard habit={habit} onToggle={onToggle} />);

    fireEvent.press(screen.getByTestId('habit-checkbox'));
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(habit);
    });
  });

  it('should not call onToggle when checkbox is pressed for skipped habit', async () => {
    const habit = createMockHabitWithLog({
      is_skipped: true,
      log_status: 'skipped',
    });
    const onToggle = jest.fn();
    render(<HabitCard habit={habit} onToggle={onToggle} />);

    fireEvent.press(screen.getByTestId('habit-checkbox'));
    await waitFor(() => {
      expect(onToggle).not.toHaveBeenCalled();
    });
  });
});
