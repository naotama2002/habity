import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MultiSelect, timeOfDayOptions, weekdayOptions } from '../MultiSelect';

describe('MultiSelect', () => {
  const basicOptions = [
    { value: 'a', label: 'オプションA' },
    { value: 'b', label: 'オプションB' },
    { value: 'c', label: 'オプションC' },
  ];

  describe('rendering', () => {
    it('should render all options', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByText('オプションA')).toBeTruthy();
      expect(screen.getByText('オプションB')).toBeTruthy();
      expect(screen.getByText('オプションC')).toBeTruthy();
    });

    it('should show checkmark for selected options', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={['a']}
          onChange={onChange}
        />
      );

      // Selected option should be accessible as checked
      const optionA = screen.getByLabelText('オプションA');
      expect(optionA.props.accessibilityState.checked).toBe(true);

      const optionB = screen.getByLabelText('オプションB');
      expect(optionB.props.accessibilityState.checked).toBe(false);
    });
  });

  describe('selection', () => {
    it('should add option when unselected option is pressed', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={['a']}
          onChange={onChange}
        />
      );

      fireEvent.press(screen.getByText('オプションB'));
      expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    });

    it('should remove option when selected option is pressed', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={['a', 'b']}
          onChange={onChange}
        />
      );

      fireEvent.press(screen.getByText('オプションA'));
      expect(onChange).toHaveBeenCalledWith(['b']);
    });

    it('should not remove last option when minSelect is 1', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={['a']}
          onChange={onChange}
          minSelect={1}
        />
      );

      fireEvent.press(screen.getByText('オプションA'));
      // Should not call onChange because we can't go below minSelect
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not add option when maxSelect is reached', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={['a', 'b']}
          onChange={onChange}
          maxSelect={2}
        />
      );

      fireEvent.press(screen.getByText('オプションC'));
      // Should not call onChange because we're at maxSelect
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not respond to press when disabled', () => {
      const onChange = jest.fn();
      render(
        <MultiSelect
          options={basicOptions}
          value={['a']}
          onChange={onChange}
          disabled
        />
      );

      fireEvent.press(screen.getByText('オプションB'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('preset options', () => {
    it('should have correct timeOfDayOptions', () => {
      expect(timeOfDayOptions).toHaveLength(5);
      expect(timeOfDayOptions.map((o) => o.value)).toEqual([
        'anytime',
        'morning',
        'afternoon',
        'evening',
        'night',
      ]);
    });

    it('should have correct weekdayOptions', () => {
      expect(weekdayOptions).toHaveLength(7);
      expect(weekdayOptions.map((o) => o.value)).toEqual([
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun',
      ]);
    });
  });
});
