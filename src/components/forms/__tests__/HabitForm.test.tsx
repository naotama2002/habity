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

      expect(screen.getByText('習慣名')).toBeTruthy();
      expect(screen.getByText('説明')).toBeTruthy();
      expect(screen.getByText('トラッキング方法')).toBeTruthy();
      expect(screen.getByText('目標期間')).toBeTruthy();
      expect(screen.getByText('実行する時間帯')).toBeTruthy();
      expect(screen.getByText('開始日')).toBeTruthy();
    });

    it('should render submit and cancel buttons', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('保存')).toBeTruthy();
      expect(screen.getByText('キャンセル')).toBeTruthy();
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
        name: 'テスト習慣',
        description: 'テスト説明',
      };

      render(
        <HabitForm
          initialValues={initialValues}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue('テスト習慣')).toBeTruthy();
      expect(screen.getByDisplayValue('テスト説明')).toBeTruthy();
    });

    it('should use default values when no initial values provided', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Default tracking type is 'boolean' (やったか)
      expect(screen.getByText('やったか')).toBeTruthy();
      // Default goal period is 'daily' (毎日)
      expect(screen.getByText('毎日')).toBeTruthy();
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
      expect(screen.queryByText('目標値')).toBeNull();
    });

    it('should show goal value and unit inputs for numeric tracking type', () => {
      render(
        <HabitForm
          initialValues={{ tracking_type: 'numeric' }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('目標値')).toBeTruthy();
      expect(screen.getByText('単位')).toBeTruthy();
    });

    it('should show goal value input and 分 label for duration tracking type', () => {
      render(
        <HabitForm
          initialValues={{ tracking_type: 'duration' }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('目標値')).toBeTruthy();
      expect(screen.getByText('分')).toBeTruthy();
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
      fireEvent.press(screen.getByText('保存'));

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
      const nameInput = screen.getByPlaceholderText('例: 読書、運動、瞑想');
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
      const nameInput = screen.getByPlaceholderText('例: 読書、運動、瞑想');
      fireEvent.changeText(nameInput, 'テスト習慣');

      // Submit
      fireEvent.press(screen.getByText('保存'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.name).toBe('テスト習慣');
    });

    it('should show loading state when submitting', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByText('保存中...')).toBeTruthy();
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
      const nameInput = screen.getByPlaceholderText('例: 読書、運動、瞑想');
      fireEvent.changeText(nameInput, 'テスト習慣');

      // Submit
      fireEvent.press(screen.getByText('保存'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
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

      fireEvent.press(screen.getByText('キャンセル'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      // ダイアログは表示されない
      expect(screen.queryByText('変更を破棄')).toBeNull();
    });

    it('should show confirmation dialog when form is dirty', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Make form dirty by changing a field
      const nameInput = screen.getByPlaceholderText('例: 読書、運動、瞑想');
      fireEvent.changeText(nameInput, '変更した値');

      fireEvent.press(screen.getByText('キャンセル'));

      // ConfirmDialogが表示されることを確認
      expect(screen.getByText('変更を破棄')).toBeTruthy();
      expect(screen.getByText('入力した内容は保存されません。よろしいですか？')).toBeTruthy();
      expect(screen.getByText('破棄')).toBeTruthy();
      expect(screen.getByText('編集を続ける')).toBeTruthy();
    });

    it('should call onCancel when confirm button is pressed in dialog', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Make form dirty
      const nameInput = screen.getByPlaceholderText('例: 読書、運動、瞑想');
      fireEvent.changeText(nameInput, '変更した値');

      // Open dialog
      fireEvent.press(screen.getByText('キャンセル'));

      // Press confirm button
      fireEvent.press(screen.getByText('破棄'));

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
      const nameInput = screen.getByPlaceholderText('例: 読書、運動、瞑想');
      fireEvent.changeText(nameInput, '変更した値');

      // Open dialog
      fireEvent.press(screen.getByText('キャンセル'));

      // Press cancel button in dialog
      fireEvent.press(screen.getByText('編集を続ける'));

      // Dialog should be closed (title should not be visible)
      expect(screen.queryByText('変更を破棄')).toBeNull();
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
      fireEvent.press(screen.getByText('数値'));

      // Goal value field should appear
      expect(screen.getByText('目標値')).toBeTruthy();
    });

    it('should update time of day when chip is pressed', () => {
      render(
        <HabitForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Default is 'anytime', add 'morning'
      fireEvent.press(screen.getByText('朝'));

      // Both should be selected now
      const morningChip = screen.getByLabelText('朝');
      expect(morningChip.props.accessibilityState.checked).toBe(true);
    });
  });
});
