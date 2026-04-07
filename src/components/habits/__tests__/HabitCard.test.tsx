import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import {Linking, StyleSheet} from 'react-native';
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

  describe('period progress', () => {
    it('should not show period progress for daily habits', () => {
      const habit = createMockHabitWithLog({goal_period: 'daily'});
      render(<HabitCard habit={habit} />);
      expect(screen.queryByTestId('period-progress')).toBeNull();
    });

    it('should show period progress for weekly habits', () => {
      const habit = createMockHabitWithLog({
        goal_period: 'weekly',
        goal_value: 3,
        period_completed_count: 2,
      });
      render(<HabitCard habit={habit} />);
      expect(screen.getByTestId('period-progress')).toBeTruthy();
      expect(screen.getByText('2/3')).toBeTruthy();
    });

    it('should show period progress for monthly habits', () => {
      const habit = createMockHabitWithLog({
        goal_period: 'monthly',
        goal_value: 10,
        period_completed_count: 5,
      });
      render(<HabitCard habit={habit} />);
      expect(screen.getByText('5/10')).toBeTruthy();
    });

    it('should show exceeded count (5/3)', () => {
      const habit = createMockHabitWithLog({
        goal_period: 'weekly',
        goal_value: 3,
        period_completed_count: 5,
        is_completed: true,
      });
      render(<HabitCard habit={habit} />);
      expect(screen.getByText('5/3')).toBeTruthy();
    });
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

  it('should render streak badge as inactive when today is not completed', () => {
    const habit = createMockHabitWithLog({is_completed: false, is_skipped: false});
    render(<HabitCard habit={habit} streak={5} />);

    const streakText = screen.getByTestId('habit-streak-badge-text');
    expect(StyleSheet.flatten(streakText.props.style)).toMatchObject({
      color: '#9ca3af',
    });
  });

  it('should render streak badge as active immediately after checking today', () => {
    const habit = createMockHabitWithLog({is_completed: false, is_skipped: false});
    render(<HabitCard habit={habit} streak={5} onToggle={jest.fn()} />);

    fireEvent.press(screen.getByTestId('habit-checkbox'));

    const streakText = screen.getByTestId('habit-streak-badge-text');
    expect(StyleSheet.flatten(streakText.props.style)).toMatchObject({
      color: '#f97316',
    });
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

    it('should call onMenuOpenChange when link menu opens and closes', () => {
      const onMenuOpenChange = jest.fn();
      const habit = createMockHabitWithLog({
        description: 'Open https://example.com',
      });
      render(
        <HabitCard habit={habit} onMenuOpenChange={onMenuOpenChange} />,
      );

      fireEvent.press(screen.getByTestId('habit-link-button'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(true);

      fireEvent.press(screen.getByTestId('habit-link-overlay'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('action menu', () => {
    it('should render action menu button', () => {
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} />);
      expect(screen.getByTestId('habit-actions-button')).toBeTruthy();
    });

    it('should show menu with skip option when button is pressed (incomplete habit)', () => {
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} onSkip={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));

      expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();
      expect(screen.getByText('Skip for today')).toBeTruthy();
      expect(screen.getByText('Streak will not be broken')).toBeTruthy();
    });

    it('should show unskip option when habit is already skipped', () => {
      const habit = createMockHabitWithLog({is_skipped: true, log_status: 'skipped'});
      render(<HabitCard habit={habit} onUnskip={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));

      expect(screen.getByText('Remove skip')).toBeTruthy();
      expect(screen.queryByText('Skip for today')).toBeNull();
    });

    it('should show uncomplete option when habit is completed', () => {
      const habit = createMockHabitWithLog({is_completed: true, log_status: 'completed'});
      render(<HabitCard habit={habit} onUncomplete={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));

      expect(screen.getByText('Mark as incomplete')).toBeTruthy();
      expect(screen.queryByText('Skip for today')).toBeNull();
      expect(screen.queryByText('Remove skip')).toBeNull();
    });

    it('should call onSkip when skip option is pressed', () => {
      const onSkip = jest.fn();
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} onSkip={onSkip} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));
      fireEvent.press(screen.getByTestId('habit-action-skip'));

      expect(onSkip).toHaveBeenCalled();
    });

    it('should call onUnskip when unskip option is pressed', () => {
      const onUnskip = jest.fn();
      const habit = createMockHabitWithLog({is_skipped: true, log_status: 'skipped'});
      render(<HabitCard habit={habit} onUnskip={onUnskip} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));
      fireEvent.press(screen.getByTestId('habit-action-unskip'));

      expect(onUnskip).toHaveBeenCalled();
    });

    it('should call onUncomplete when uncomplete option is pressed', () => {
      const onUncomplete = jest.fn();
      const habit = createMockHabitWithLog({is_completed: true, log_status: 'completed'});
      render(<HabitCard habit={habit} onUncomplete={onUncomplete} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));
      fireEvent.press(screen.getByTestId('habit-action-uncomplete'));

      expect(onUncomplete).toHaveBeenCalled();
    });

    it('should close menu after action', () => {
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} onSkip={jest.fn()} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));
      expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('habit-action-skip'));
      expect(screen.queryByTestId('habit-actions-menu')).toBeNull();
    });

    it('should call onMenuOpenChange when action menu opens and closes', () => {
      const onMenuOpenChange = jest.fn();
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} onMenuOpenChange={onMenuOpenChange} />);

      // Open
      fireEvent.press(screen.getByTestId('habit-actions-button'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(true);

      // Close
      fireEvent.press(screen.getByTestId('habit-actions-button'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onMenuOpenChange(false) when action is taken', () => {
      const onMenuOpenChange = jest.fn();
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} onSkip={jest.fn()} onMenuOpenChange={onMenuOpenChange} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));
      onMenuOpenChange.mockClear();

      fireEvent.press(screen.getByTestId('habit-action-skip'));
      expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    });

    it('should toggle menu on button press', () => {
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} />);

      // Open
      fireEvent.press(screen.getByTestId('habit-actions-button'));
      expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();

      // Close
      fireEvent.press(screen.getByTestId('habit-actions-button'));
      expect(screen.queryByTestId('habit-actions-menu')).toBeNull();
    });

    it('should close menu when overlay is pressed', () => {
      const habit = createMockHabitWithLog();
      render(<HabitCard habit={habit} />);

      fireEvent.press(screen.getByTestId('habit-actions-button'));
      expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();

      fireEvent.press(screen.getByTestId('habit-actions-overlay'));
      expect(screen.queryByTestId('habit-actions-menu')).toBeNull();
    });
  });
});
