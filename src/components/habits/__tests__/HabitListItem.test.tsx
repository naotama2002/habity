import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {HabitListItem} from '../HabitListItem';
import type {Habit} from '@/types/database';

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

  it('should not show arrow buttons in normal mode', () => {
    render(<HabitListItem habit={createMockHabit()} />);
    expect(screen.queryByLabelText('Move up')).toBeNull();
    expect(screen.queryByLabelText('Move down')).toBeNull();
  });

  it('should call onPress when tapped in normal mode', () => {
    const habit = createMockHabit();
    const onPress = jest.fn();
    render(<HabitListItem habit={habit} onPress={onPress} />);

    fireEvent.press(screen.getByText('Test Habit'));
    expect(onPress).toHaveBeenCalledWith(habit);
  });

  describe('editMode', () => {
    it('should show up and down arrow buttons', () => {
      render(<HabitListItem habit={createMockHabit()} editMode />);
      expect(screen.getByLabelText('Move up')).toBeTruthy();
      expect(screen.getByLabelText('Move down')).toBeTruthy();
    });

    it('should not call onPress when tapped', () => {
      const onPress = jest.fn();
      render(<HabitListItem habit={createMockHabit()} editMode onPress={onPress} />);

      fireEvent.press(screen.getByText('Test Habit'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should disable up arrow when isFirst is true', () => {
      render(<HabitListItem habit={createMockHabit()} editMode isFirst />);
      const upButton = screen.getByLabelText('Move up');
      expect(upButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should disable down arrow when isLast is true', () => {
      render(<HabitListItem habit={createMockHabit()} editMode isLast />);
      const downButton = screen.getByLabelText('Move down');
      expect(downButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should call onMoveUp when up arrow is pressed', () => {
      const onMoveUp = jest.fn();
      render(<HabitListItem habit={createMockHabit()} editMode onMoveUp={onMoveUp} />);

      fireEvent.press(screen.getByLabelText('Move up'));
      expect(onMoveUp).toHaveBeenCalled();
    });

    it('should call onMoveDown when down arrow is pressed', () => {
      const onMoveDown = jest.fn();
      render(<HabitListItem habit={createMockHabit()} editMode onMoveDown={onMoveDown} />);

      fireEvent.press(screen.getByLabelText('Move down'));
      expect(onMoveDown).toHaveBeenCalled();
    });
  });
});
