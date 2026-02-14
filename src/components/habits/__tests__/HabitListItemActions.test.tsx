import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Text} from 'react-native';
import {HabitListItemActions} from '../HabitListItemActions';

const defaultProps = {
  isArchived: false,
  onArchive: jest.fn(),
  onUnarchive: jest.fn(),
};

describe('HabitListItemActions', () => {
  it('should render children and menu button', () => {
    render(
      <HabitListItemActions {...defaultProps}>
        <Text>Child Content</Text>
      </HabitListItemActions>,
    );

    expect(screen.getByText('Child Content')).toBeTruthy();
    expect(screen.getByTestId('habit-list-actions-button')).toBeTruthy();
  });

  it('should show menu with archive option for active habit', () => {
    render(
      <HabitListItemActions {...defaultProps} isArchived={false}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));

    expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.queryByText('Unarchive')).toBeNull();
  });

  it('should show menu with unarchive option for archived habit', () => {
    render(
      <HabitListItemActions {...defaultProps} isArchived={true}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));

    expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();
    expect(screen.getByText('Unarchive')).toBeTruthy();
    expect(screen.queryByText('Archive')).toBeNull();
  });

  it('should call onArchive when archive option is pressed', () => {
    const onArchive = jest.fn();
    render(
      <HabitListItemActions {...defaultProps} onArchive={onArchive}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    fireEvent.press(screen.getByTestId('habit-list-action-archive'));

    expect(onArchive).toHaveBeenCalled();
  });

  it('should call onUnarchive when unarchive option is pressed', () => {
    const onUnarchive = jest.fn();
    render(
      <HabitListItemActions {...defaultProps} isArchived={true} onUnarchive={onUnarchive}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    fireEvent.press(screen.getByTestId('habit-list-action-unarchive'));

    expect(onUnarchive).toHaveBeenCalled();
  });

  it('should close menu after action', () => {
    render(
      <HabitListItemActions {...defaultProps}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();

    fireEvent.press(screen.getByTestId('habit-list-action-archive'));
    expect(screen.queryByTestId('habit-list-actions-menu')).toBeNull();
  });

  it('should call onOpenChange when menu opens and closes', () => {
    const onOpenChange = jest.fn();
    render(
      <HabitListItemActions {...defaultProps} onOpenChange={onOpenChange}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    // Open
    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    // Close
    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange(false) when action is taken', () => {
    const onOpenChange = jest.fn();
    render(
      <HabitListItemActions {...defaultProps} onOpenChange={onOpenChange}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    onOpenChange.mockClear();

    fireEvent.press(screen.getByTestId('habit-list-action-archive'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should toggle menu on button press', () => {
    render(
      <HabitListItemActions {...defaultProps}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    // Open
    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();

    // Close
    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    expect(screen.queryByTestId('habit-list-actions-menu')).toBeNull();
  });

  it('should close menu when overlay is pressed', () => {
    render(
      <HabitListItemActions {...defaultProps}>
        <Text>Child</Text>
      </HabitListItemActions>,
    );

    fireEvent.press(screen.getByTestId('habit-list-actions-button'));
    expect(screen.getByTestId('habit-list-actions-menu')).toBeTruthy();

    fireEvent.press(screen.getByTestId('habit-list-actions-overlay'));
    expect(screen.queryByTestId('habit-list-actions-menu')).toBeNull();
  });
});
