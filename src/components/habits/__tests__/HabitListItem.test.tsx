import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {HabitListItem} from '../HabitListItem';
import type {Habit} from '@/types/database';

jest.mock('@/lib/recurrence', () => ({
  parseRRule: jest.fn(() => ({type: 'interval', interval: 1})),
}));

function createMockHabit(overrides: Partial<Habit> = {}): Habit {
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
    end_date: null,
    status: 'active',
    sort_order: 0,
    external_id: null,
    external_source: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('HabitListItem', () => {
  it('should render habit name', () => {
    render(<HabitListItem habit={createMockHabit({name: 'Morning Run'})} />);
    expect(screen.getByText('Morning Run')).toBeTruthy();
  });

  it('should call onPress when tapped in normal mode', () => {
    const habit = createMockHabit();
    const onPress = jest.fn();
    render(<HabitListItem habit={habit} onPress={onPress} />);

    fireEvent.press(screen.getByText('Test Habit'));
    expect(onPress).toHaveBeenCalledWith(habit);
  });

  describe('frequency text', () => {
    it('should show "Daily" for daily habits without recurrence', () => {
      render(<HabitListItem habit={createMockHabit({goal_period: 'daily'})} />);
      expect(screen.getByText('Daily')).toBeTruthy();
    });

    it('should show "3times per week" for weekly habits', () => {
      render(<HabitListItem habit={createMockHabit({goal_period: 'weekly', goal_value: 3})} />);
      expect(screen.getByText('3times per week')).toBeTruthy();
    });

    it('should show "7times per month" for monthly habits', () => {
      render(<HabitListItem habit={createMockHabit({goal_period: 'monthly', goal_value: 7})} />);
      expect(screen.getByText('7times per month')).toBeTruthy();
    });
  });

  describe('editMode', () => {
    it('should not call onPress when tapped', () => {
      const onPress = jest.fn();
      render(<HabitListItem habit={createMockHabit()} editMode onPress={onPress} />);

      fireEvent.press(screen.getByText('Test Habit'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not show streak badge in edit mode', () => {
      render(<HabitListItem habit={createMockHabit()} editMode />);
      expect(screen.queryByText(/days/)).toBeNull();
    });

    it('should not show action menu button in edit mode', () => {
      render(<HabitListItem habit={createMockHabit()} editMode />);
      expect(screen.queryByTestId('habit-list-actions-button')).toBeNull();
    });
  });

  describe('action menu', () => {
    it('should render action menu button', () => {
      render(<HabitListItem habit={createMockHabit()} />);
      expect(screen.getByTestId('habit-list-actions-button')).toBeTruthy();
    });

    it('should show menu with archive option for active habit', () => {
      render(<HabitListItem habit={createMockHabit()} isArchived={false} onArchive={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));

      expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();
      expect(screen.getByText('Archive')).toBeTruthy();
      expect(screen.queryByText('Unarchive')).toBeNull();
    });

    it('should show menu with unarchive option for archived habit', () => {
      render(<HabitListItem habit={createMockHabit()} isArchived={true} onUnarchive={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));

      expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();
      expect(screen.getByText('Unarchive')).toBeTruthy();
      expect(screen.queryByText('Archive')).toBeNull();
    });

    it('should call onArchive when archive option is pressed', () => {
      const onArchive = jest.fn();
      render(<HabitListItem habit={createMockHabit()} onArchive={onArchive} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      fireEvent.press(screen.getByTestId('habit-list-action-archive'));

      expect(onArchive).toHaveBeenCalled();
    });

    it('should call onUnarchive when unarchive option is pressed', () => {
      const onUnarchive = jest.fn();
      render(<HabitListItem habit={createMockHabit()} isArchived={true} onUnarchive={onUnarchive} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      fireEvent.press(screen.getByTestId('habit-list-action-unarchive'));

      expect(onUnarchive).toHaveBeenCalled();
    });

    it('should close menu after action', () => {
      render(<HabitListItem habit={createMockHabit()} onArchive={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('habit-list-action-archive'));
      expect(screen.queryByTestId('habit-list-actions-menu')).toBeNull();
    });

    it('should call onMenuOpenChange when menu opens and closes', () => {
      const onMenuOpenChange = jest.fn();
      render(<HabitListItem habit={createMockHabit()} onMenuOpenChange={onMenuOpenChange} />);

      // Open
      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(true);

      // Close
      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onMenuOpenChange(false) when action is taken', () => {
      const onMenuOpenChange = jest.fn();
      render(<HabitListItem habit={createMockHabit()} onArchive={jest.fn()} onMenuOpenChange={onMenuOpenChange} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      onMenuOpenChange.mockClear();

      fireEvent.press(screen.getByTestId('habit-list-action-archive'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    });

    it('should toggle menu on button press', () => {
      render(<HabitListItem habit={createMockHabit()} />);

      // Open
      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();

      // Close
      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      expect(screen.queryByTestId('habit-list-actions-menu')).toBeNull();
    });

    it('should close menu when overlay is pressed', () => {
      render(<HabitListItem habit={createMockHabit()} />);

      fireEvent.press(screen.getByTestId('habit-list-actions-button'));
      expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('habit-list-actions-overlay'));
      expect(screen.queryByTestId('habit-list-actions-menu')).toBeNull();
    });
  });
});
