import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Text} from 'react-native';
import {HabitCardActions} from '../HabitCardActions';

const defaultProps = {
  isCompleted: false,
  isSkipped: false,
  onSkip: jest.fn(),
  onUnskip: jest.fn(),
  onUncomplete: jest.fn(),
};

describe('HabitCardActions', () => {
  it('should render children and menu button', () => {
    render(
      <HabitCardActions {...defaultProps}>
        <Text>Child Content</Text>
      </HabitCardActions>,
    );

    expect(screen.getByText('Child Content')).toBeTruthy();
    expect(screen.getByTestId('habit-actions-button')).toBeTruthy();
  });

  it('should show menu with skip option when button is pressed (incomplete habit)', () => {
    render(
      <HabitCardActions {...defaultProps}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));

    expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();
    expect(screen.getByText('Skip for today')).toBeTruthy();
    expect(screen.getByText('Streak will not be broken')).toBeTruthy();
  });

  it('should show unskip option when habit is already skipped', () => {
    render(
      <HabitCardActions {...defaultProps} isSkipped={true}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));

    expect(screen.getByText('Remove skip')).toBeTruthy();
    expect(screen.queryByText('Skip for today')).toBeNull();
  });

  it('should show uncomplete option when habit is completed', () => {
    render(
      <HabitCardActions {...defaultProps} isCompleted={true}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));

    expect(screen.getByText('Mark as incomplete')).toBeTruthy();
    expect(screen.queryByText('Skip for today')).toBeNull();
    expect(screen.queryByText('Remove skip')).toBeNull();
  });

  it('should call onSkip when skip option is pressed', () => {
    const onSkip = jest.fn();
    render(
      <HabitCardActions {...defaultProps} onSkip={onSkip}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    fireEvent.press(screen.getByTestId('habit-action-skip'));

    expect(onSkip).toHaveBeenCalled();
  });

  it('should call onUnskip when unskip option is pressed', () => {
    const onUnskip = jest.fn();
    render(
      <HabitCardActions {...defaultProps} isSkipped={true} onUnskip={onUnskip}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    fireEvent.press(screen.getByTestId('habit-action-unskip'));

    expect(onUnskip).toHaveBeenCalled();
  });

  it('should call onUncomplete when uncomplete option is pressed', () => {
    const onUncomplete = jest.fn();
    render(
      <HabitCardActions {...defaultProps} isCompleted={true} onUncomplete={onUncomplete}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    fireEvent.press(screen.getByTestId('habit-action-uncomplete'));

    expect(onUncomplete).toHaveBeenCalled();
  });

  it('should close menu after action', () => {
    render(
      <HabitCardActions {...defaultProps}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();

    fireEvent.press(screen.getByTestId('habit-action-skip'));
    expect(screen.queryByTestId('habit-actions-menu')).toBeNull();
  });

  it('should call onOpenChange when menu opens and closes', () => {
    const onOpenChange = jest.fn();
    render(
      <HabitCardActions {...defaultProps} onOpenChange={onOpenChange}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    // Open
    fireEvent.press(screen.getByTestId('habit-actions-button'));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    // Close
    fireEvent.press(screen.getByTestId('habit-actions-button'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange(false) when action is taken', () => {
    const onOpenChange = jest.fn();
    render(
      <HabitCardActions {...defaultProps} onOpenChange={onOpenChange}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    onOpenChange.mockClear();

    fireEvent.press(screen.getByTestId('habit-action-skip'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should toggle menu on button press', () => {
    render(
      <HabitCardActions {...defaultProps}>
        <Text>Child</Text>
      </HabitCardActions>,
    );

    // Open
    fireEvent.press(screen.getByTestId('habit-actions-button'));
    expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();

    // Close
    fireEvent.press(screen.getByTestId('habit-actions-button'));
    expect(screen.queryByTestId('habit-actions-menu')).toBeNull();
  });
});
