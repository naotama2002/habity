import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Select } from '../Select';

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  describe('rendering', () => {
    it('should show placeholder when no value is selected', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
          placeholder="Please select"
        />
      );

      expect(screen.getByText('Please select')).toBeTruthy();
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

      expect(screen.getByText('Option 2')).toBeTruthy();
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

      // i18n mock returns English
      expect(screen.getByText('Select an option')).toBeTruthy();
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

      // Press the trigger to open modal (i18n mock returns English)
      fireEvent.press(screen.getByText('Select an option'));

      // Modal should show "Select" title and all options
      expect(screen.getByText('Select')).toBeTruthy();
      expect(screen.getByText('Option 1')).toBeTruthy();
      expect(screen.getByText('Option 2')).toBeTruthy();
      expect(screen.getByText('Option 3')).toBeTruthy();
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
      fireEvent.press(screen.getByText('Select an option'));

      // Select an option
      fireEvent.press(screen.getByText('Option 2'));

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

      fireEvent.press(screen.getByText('Select an option'));

      // Modal title should not appear
      expect(screen.queryByText('Select')).toBeNull();
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
      expect(trigger.props.accessibilityLabel).toBe('Option 1');
    });

    it('should use placeholder as accessibility label when no value', () => {
      const onChange = jest.fn();
      render(
        <Select
          options={options}
          value={null}
          onChange={onChange}
          placeholder="Select a category"
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger.props.accessibilityLabel).toBe('Select a category');
    });
  });
});
