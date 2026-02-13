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

  it('should show streak badge when streak > 0', () => {
    render(<HabitListItem habit={createMockHabit()} streak={5} />);
    expect(screen.getByText(/days/)).toBeTruthy();
  });

  it('should call onPress when tapped in normal mode', () => {
    const habit = createMockHabit();
    const onPress = jest.fn();
    render(<HabitListItem habit={habit} onPress={onPress} />);

    fireEvent.press(screen.getByText('Test Habit'));
    expect(onPress).toHaveBeenCalledWith(habit);
  });

  describe('editMode', () => {
    it('should not call onPress when tapped', () => {
      const onPress = jest.fn();
      render(<HabitListItem habit={createMockHabit()} editMode onPress={onPress} />);

      fireEvent.press(screen.getByText('Test Habit'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not show streak badge in edit mode', () => {
      render(<HabitListItem habit={createMockHabit()} editMode streak={5} />);
      expect(screen.queryByText(/days/)).toBeNull();
    });
  });
});
