import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { HabitForm } from '../HabitForm';
import type { HabitSubmitData } from '../HabitForm';

// window.alert をモック
window.alert = jest.fn();

describe('HabitForm', () => {
  const mockOnSubmit = jest.fn<(data: HabitSubmitData) => Promise<void>>();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all form fields', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // i18n mock returns English message IDs
      expect(screen.getByText('Habit Name')).toBeTruthy();
      expect(screen.getByText('Description')).toBeTruthy();
      expect(screen.getByText('Recurrence')).toBeTruthy();
      expect(screen.getByText('Time of Day')).toBeTruthy();
      expect(screen.getByText('Start Date')).toBeTruthy();
    });

    it('should not render removed tracking/goal fields', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Tracking Method')).toBeNull();
      expect(screen.queryByText('Goal Period')).toBeNull();
      expect(screen.queryByText('Goal Value')).toBeNull();
    });

    it('should render submit and cancel buttons', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('should render recurrence picker with default interval type', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Default type segments should be visible
      expect(screen.getByText('Weekly')).toBeTruthy();
      expect(screen.getByText('Monthly')).toBeTruthy();
      expect(screen.getByText('Interval')).toBeTruthy();
    });
  });

  describe('initial values', () => {
    it('should populate form with initial values', () => {
      render(
        <HabitForm
          initialValues={{
            name: 'Test Habit',
            description: 'Test Description',
          }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue('Test Habit')).toBeTruthy();
      expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
    });

    it('should render start date input with initial value', () => {
      const { root } = render(
        <HabitForm
          initialValues={{
            name: 'Test Habit',
            start_date: '2025-06-15',
          }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = root.findAll((node: {type: string | React.ComponentType}) => node.type === 'input')[0];
      expect(dateInput.props.value).toBe('2025-06-15');
    });

    it('should parse recurrence_rule for editing', () => {
      render(
        <HabitForm
          initialValues={{
            name: 'Test Habit',
            recurrence_rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
          }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Weekly type should be selected and weekday buttons visible
      expect(screen.getByText('Select days of the week')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should not call onSubmit when form is invalid', async () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Press submit without entering name (form is invalid)
      fireEvent.press(screen.getByText('Save'));

      // onSubmit should not be called for invalid form
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error after field is touched', async () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Focus and blur the name input
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent(nameInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('習慣名を入力してください')).toBeTruthy();
      });
    });
  });

  describe('start date', () => {
    it('should update start date when date is changed', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      const { root } = render(
        <HabitForm
          initialValues={{
            start_date: '2025-01-01',
          }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Change the date via the native input's onChange handler
      const dateInput = root.findAll((node: {type: string | React.ComponentType}) => node.type === 'input')[0];
      act(() => {
        dateInput.props.onChange({ target: { value: '2025-06-15' } });
      });

      // Fill in required name field and submit
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Test Habit');
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.start_date).toBe('2025-06-15');
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with correct data when valid', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in required fields
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Test Habit');

      // Submit
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.name).toBe('Test Habit');
      expect(submittedData.tracking_type).toBe('boolean');
      expect(submittedData.goal_value).toBe(1);
      expect(submittedData.goal_unit).toBe('times');
      expect(submittedData.goal_period).toBe('daily');
      expect(submittedData.recurrence_rule).toContain('FREQ=DAILY');
    });

    it('should show loading state when submitting', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByText('Saving...')).toBeTruthy();
    });

    it('should show alert on submit error', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Test error'));

      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in required fields
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Test Habit');

      // Submit
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Error: Test error'
        );
      });
    });
  });

  describe('cancel behavior', () => {
    it('should call onCancel directly when form is not dirty', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(screen.getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Discard Changes')).toBeNull();
    });

    it('should show confirmation dialog when form is dirty', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Make form dirty by changing a field
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Changed Value');

      fireEvent.press(screen.getByText('Cancel'));

      expect(screen.getByText('Discard Changes')).toBeTruthy();
      expect(screen.getByText('Your input will not be saved. Are you sure?')).toBeTruthy();
    });

    it('should call onCancel when confirm button is pressed in dialog', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Changed Value');

      fireEvent.press(screen.getByText('Cancel'));
      fireEvent.press(screen.getByText('Discard'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should close dialog when cancel button is pressed in dialog', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Changed Value');

      fireEvent.press(screen.getByText('Cancel'));
      fireEvent.press(screen.getByText('Continue Editing'));

      expect(screen.queryByText('Discard Changes')).toBeNull();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('recurrence picker integration', () => {
    it('should switch to weekly mode when Weekly is pressed', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(screen.getByText('Weekly'));

      expect(screen.getByText('Select days of the week')).toBeTruthy();
    });

    it('should update time of day when chip is pressed', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(screen.getByText('Morning'));

      const morningChip = screen.getByLabelText('Morning');
      expect(morningChip.props.accessibilityState.checked).toBe(true);
    });
  });
});
