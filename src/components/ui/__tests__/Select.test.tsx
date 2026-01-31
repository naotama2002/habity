import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Select } from '../Select';

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'オプション1' },
    { value: 'option2', label: 'オプション2' },
    { value: 'option3', label: 'オプション3' },
  ];

  describe('rendering', () => {
    it('should show placeholder when no value is selected', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
          placeholder="選択してください"
        />
      );

      expect(screen.getByText('選択してください')).toBeTruthy();
    });

    it('should show selected option label', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value="option2"
          onChange={onChange}
        />
      );

      expect(screen.getByText('オプション2')).toBeTruthy();
    });

    it('should use default placeholder when not provided', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
        />
      );

      expect(screen.getByText('選択してください')).toBeTruthy();
    });
  });

  describe('modal interaction', () => {
    it('should open modal when pressed', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
        />
      );

      // Press the trigger to open modal
      fireEvent.press(screen.getByText('選択してください'));

      // Modal should show "選択" title and all options
      expect(screen.getByText('選択')).toBeTruthy();
      expect(screen.getByText('オプション1')).toBeTruthy();
      expect(screen.getByText('オプション2')).toBeTruthy();
      expect(screen.getByText('オプション3')).toBeTruthy();
    });

    it('should call onChange when option is selected', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
        />
      );

      // Open modal
      fireEvent.press(screen.getByText('選択してください'));

      // Select an option
      fireEvent.press(screen.getByText('オプション2'));

      expect(onChange).toHaveBeenCalledWith('option2');
    });
  });

  describe('disabled state', () => {
    it('should not open modal when disabled', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
          disabled
        />
      );

      fireEvent.press(screen.getByText('選択してください'));

      // Modal title should not appear
      expect(screen.queryByText('選択')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label for trigger', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value="option1"
          onChange={onChange}
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger.props.accessibilityLabel).toBe('オプション1');
    });

    it('should use placeholder as accessibility label when no value', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
          placeholder="カテゴリを選択"
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger.props.accessibilityLabel).toBe('カテゴリを選択');
    });
  });
});
