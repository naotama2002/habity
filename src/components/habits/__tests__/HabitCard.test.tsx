import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import {Linking} from 'react-native';
import {HabitCard} from '../HabitCard';
import type {HabitWithLog} from '@/types/database';

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

  it('should show checkmark immediately on toggle (optimistic update)', () => {
    const habit = createMockHabitWithLog({is_completed: false});
    render(<HabitCard habit={habit} onToggle={jest.fn()} />);

    // チェックマークがまだ表示されていないことを確認
    expect(screen.queryByText('✓')).toBeNull();

    // チェックボックスを押す
    fireEvent.press(screen.getByTestId('habit-checkbox'));

    // サーバー応答前にチェックマークが即座に表示される
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('should hide checkmark immediately on uncomplete toggle (optimistic update)', () => {
    const habit = createMockHabitWithLog({
      is_completed: true,
      log_id: 'log-1',
      log_status: 'completed',
    });
    render(<HabitCard habit={habit} onToggle={jest.fn()} />);

    // チェックマークが表示されていることを確認
    expect(screen.getByText('✓')).toBeTruthy();

    // チェックボックスを押す（未完了に戻す）
    fireEvent.press(screen.getByTestId('habit-checkbox'));

    // チェックマークが即座に消える
    expect(screen.queryByText('✓')).toBeNull();
  });

  describe('link button', () => {
    it('should not show link button when description has no URLs', () => {
      const habit = createMockHabitWithLog({description: 'No links here'});
      render(<HabitCard habit={habit} />);
      expect(screen.queryByTestId('habit-link-button')).toBeNull();
    });

    it('should not show link button when description is null', () => {
      const habit = createMockHabitWithLog({description: null});
      render(<HabitCard habit={habit} />);
      expect(screen.queryByTestId('habit-link-button')).toBeNull();
    });

    it('should show link button when description contains a URL', () => {
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(<HabitCard habit={habit} />);
      expect(screen.getByTestId('habit-link-button')).toBeTruthy();
    });

    it('should show link menu when link button is pressed', () => {
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(<HabitCard habit={habit} />);

      fireEvent.press(screen.getByTestId('habit-link-button'));
      expect(screen.getByTestId('habit-link-menu')).toBeTruthy();
    });

    it('should display URLs in link menu', () => {
      const habit = createMockHabitWithLog({
        description: 'Visit https://example.com and myapp://start',
      });
      render(<HabitCard habit={habit} />);

      fireEvent.press(screen.getByTestId('habit-link-button'));
      expect(screen.getByText('https://example.com')).toBeTruthy();
      expect(screen.getByText('myapp://start')).toBeTruthy();
    });

    it('should call Linking.openURL when a URL in the menu is pressed', () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(<HabitCard habit={habit} />);

      fireEvent.press(screen.getByTestId('habit-link-button'));
      fireEvent.press(screen.getByText('https://example.com'));

      expect(openURLSpy).toHaveBeenCalledWith('https://example.com');
      openURLSpy.mockRestore();
    });

    it('should close menu after URL is pressed', () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(<HabitCard habit={habit} />);

      fireEvent.press(screen.getByTestId('habit-link-button'));
      expect(screen.getByTestId('habit-link-menu')).toBeTruthy();

      fireEvent.press(screen.getByText('https://example.com'));
      expect(screen.queryByTestId('habit-link-menu')).toBeNull();

      jest.restoreAllMocks();
    });

    it('should close menu when overlay is pressed', () => {
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(<HabitCard habit={habit} />);

      fireEvent.press(screen.getByTestId('habit-link-button'));
      expect(screen.getByTestId('habit-link-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('habit-link-overlay'));
      expect(screen.queryByTestId('habit-link-menu')).toBeNull();
    });

    it('should call onLinkMenuOpenChange when menu opens and closes', () => {
      const onLinkMenuOpenChange = jest.fn();
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(
        <HabitCard habit={habit} onLinkMenuOpenChange={onLinkMenuOpenChange} />,
      );

      fireEvent.press(screen.getByTestId('habit-link-button'));
      expect(onLinkMenuOpenChange).toHaveBeenCalledWith(true);

      fireEvent.press(screen.getByTestId('habit-link-overlay'));
      expect(onLinkMenuOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
