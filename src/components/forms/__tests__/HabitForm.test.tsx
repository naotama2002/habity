import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { HabitForm } from '../HabitForm';
import type { HabitFormData } from '@/lib/validation/habit';

// Alert をモック
jest.spyOn(Alert, 'alert');

describe('HabitForm', () => {
  const mockOnSubmit = jest.fn<(data: HabitFormData) => Promise<void>>();
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
      expect(screen.getByText('Tracking Method')).toBeTruthy();
      expect(screen.getByText('Goal Period')).toBeTruthy();
      expect(screen.getByText('Time of Day')).toBeTruthy();
      expect(screen.getByText('Start Date')).toBeTruthy();
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

    it('should show required markers for required fields', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Required fields have * marker
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBeGreaterThan(0);
    });
  });

  describe('initial values', () => {
    it('should populate form with initial values', () => {
      const initialValues: Partial<HabitFormData> = {
        name: 'Test Habit',
        description: 'Test Description',
      };

      render(
        <HabitForm
          initialValues={initialValues}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue('Test Habit')).toBeTruthy();
      expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
    });

    it('should use default values when no initial values provided', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Default tracking type is 'boolean' (Did it)
      expect(screen.getByText('Did it')).toBeTruthy();
      // Default goal period is 'daily' (Daily)
      expect(screen.getByText('Daily')).toBeTruthy();
    });
  });

  describe('conditional fields', () => {
    it('should not show goal value input for boolean tracking type', () => {
      render(
        <HabitForm
          initialValues={{ tracking_type: 'boolean' }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Goal value field should not be present
      expect(screen.queryByText('Goal Value')).toBeNull();
    });

    it('should show goal value and unit inputs for numeric tracking type', () => {
      render(
        <HabitForm
          initialValues={{ tracking_type: 'numeric' }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Goal Value')).toBeTruthy();
      expect(screen.getByText('Unit')).toBeTruthy();
    });

    it('should show goal value input and min label for duration tracking type', () => {
      render(
        <HabitForm
          initialValues={{ tracking_type: 'duration' }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Goal Value')).toBeTruthy();
      expect(screen.getByText('min')).toBeTruthy();
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

  describe('form submission', () => {
    it('should call onSubmit with form data when valid', async () => {
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
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Test error'
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
      // Dialog should not be shown
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

      // ConfirmDialog should be shown
      expect(screen.getByText('Discard Changes')).toBeTruthy();
      expect(screen.getByText('Your input will not be saved. Are you sure?')).toBeTruthy();
      expect(screen.getByText('Discard')).toBeTruthy();
      expect(screen.getByText('Continue Editing')).toBeTruthy();
    });

    it('should call onCancel when confirm button is pressed in dialog', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Make form dirty
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Changed Value');

      // Open dialog
      fireEvent.press(screen.getByText('Cancel'));

      // Press confirm button
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

      // Make form dirty
      const nameInput = screen.getByPlaceholderText('e.g., Reading, Exercise, Meditation');
      fireEvent.changeText(nameInput, 'Changed Value');

      // Open dialog
      fireEvent.press(screen.getByText('Cancel'));

      // Press cancel button in dialog
      fireEvent.press(screen.getByText('Continue Editing'));

      // Dialog should be closed (title should not be visible)
      expect(screen.queryByText('Discard Changes')).toBeNull();
      // onCancel should not have been called
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('field updates', () => {
    it('should update tracking type when segment is pressed', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Change to numeric
      fireEvent.press(screen.getByText('Numeric'));

      // Goal value field should appear
      expect(screen.getByText('Goal Value')).toBeTruthy();
    });

    it('should update time of day when chip is pressed', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Default is 'anytime', add 'morning'
      fireEvent.press(screen.getByText('Morning'));

      // Both should be selected now
      const morningChip = screen.getByLabelText('Morning');
      expect(morningChip.props.accessibilityState.checked).toBe(true);
    });
  });
});
