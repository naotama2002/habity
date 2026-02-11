import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Text} from 'react-native';
import {HabitCardActions} from '../HabitCardActions.web';

describe('HabitCardActions (Web)', () => {
  it('should render children and menu button', () => {
    render(
      <HabitCardActions
        isSkipped={false}
        onSkip={jest.fn()}
        onUnskip={jest.fn()}
      >
        <Text>Child Content</Text>
      </HabitCardActions>,
    );

    expect(screen.getByText('Child Content')).toBeTruthy();
    expect(screen.getByTestId('habit-actions-button')).toBeTruthy();
  });

  it('should show menu with skip option when button is pressed', () => {
    render(
      <HabitCardActions
        isSkipped={false}
        onSkip={jest.fn()}
        onUnskip={jest.fn()}
      >
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
      <HabitCardActions
        isSkipped={true}
        onSkip={jest.fn()}
        onUnskip={jest.fn()}
      >
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));

    expect(screen.getByText('Remove skip')).toBeTruthy();
    expect(screen.queryByText('Skip for today')).toBeNull();
  });

  it('should call onSkip when skip option is pressed', () => {
    const onSkip = jest.fn();
    render(
      <HabitCardActions
        isSkipped={false}
        onSkip={onSkip}
        onUnskip={jest.fn()}
      >
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
      <HabitCardActions
        isSkipped={true}
        onSkip={jest.fn()}
        onUnskip={onUnskip}
      >
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    fireEvent.press(screen.getByTestId('habit-action-unskip'));

    expect(onUnskip).toHaveBeenCalled();
  });

  it('should close menu after action', () => {
    render(
      <HabitCardActions
        isSkipped={false}
        onSkip={jest.fn()}
        onUnskip={jest.fn()}
      >
        <Text>Child</Text>
      </HabitCardActions>,
    );

    fireEvent.press(screen.getByTestId('habit-actions-button'));
    expect(screen.getByTestId('habit-actions-menu')).toBeTruthy();

    fireEvent.press(screen.getByTestId('habit-action-skip'));
    expect(screen.queryByTestId('habit-actions-menu')).toBeNull();
  });

  it('should toggle menu on button press', () => {
    render(
      <HabitCardActions
        isSkipped={false}
        onSkip={jest.fn()}
        onUnskip={jest.fn()}
      >
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
