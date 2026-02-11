import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {RecurrencePicker} from '../RecurrencePicker';

describe('RecurrencePicker', () => {
  const defaultProps = {
    type: 'weekly' as const,
    weekdays: [] as number[],
    monthdays: [] as number[],
    interval: 1,
    onTypeChange: jest.fn(),
    onWeekdaysChange: jest.fn(),
    onMonthdaysChange: jest.fn(),
    onIntervalChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('type selection', () => {
    it('should render all type segments', () => {
      render(<RecurrencePicker {...defaultProps} />);
      expect(screen.getByText('Weekly')).toBeTruthy();
      expect(screen.getByText('Monthly')).toBeTruthy();
      expect(screen.getByText('Interval')).toBeTruthy();
    });

    it('should call onTypeChange when a segment is pressed', () => {
      render(<RecurrencePicker {...defaultProps} />);
      fireEvent.press(screen.getByText('Monthly'));
      expect(defaultProps.onTypeChange).toHaveBeenCalledWith('monthly');
    });
  });

  describe('weekly mode', () => {
    it('should show weekday buttons when type is weekly', () => {
      render(<RecurrencePicker {...defaultProps} type="weekly" />);
      expect(screen.getByText('Select days of the week')).toBeTruthy();
      expect(screen.getByText('Mon')).toBeTruthy();
      expect(screen.getByText('Tue')).toBeTruthy();
      expect(screen.getByText('Wed')).toBeTruthy();
      expect(screen.getByText('Thu')).toBeTruthy();
      expect(screen.getByText('Fri')).toBeTruthy();
      expect(screen.getByText('Sat')).toBeTruthy();
      expect(screen.getByText('Sun')).toBeTruthy();
    });

    it('should call onWeekdaysChange when a weekday is toggled on', () => {
      render(<RecurrencePicker {...defaultProps} type="weekly" weekdays={[]} />);
      fireEvent.press(screen.getByText('Mon'));
      expect(defaultProps.onWeekdaysChange).toHaveBeenCalledWith([0]);
    });

    it('should call onWeekdaysChange when a weekday is toggled off', () => {
      render(
        <RecurrencePicker {...defaultProps} type="weekly" weekdays={[0, 2]} />,
      );
      fireEvent.press(screen.getByText('Mon'));
      expect(defaultProps.onWeekdaysChange).toHaveBeenCalledWith([2]);
    });

    it('should not show monthly or interval options', () => {
      render(<RecurrencePicker {...defaultProps} type="weekly" />);
      expect(screen.queryByText('Select days of the month')).toBeNull();
      expect(screen.queryByText('days')).toBeNull();
    });
  });

  describe('monthly mode', () => {
    it('should show monthday buttons when type is monthly', () => {
      render(<RecurrencePicker {...defaultProps} type="monthly" />);
      expect(screen.getByText('Select days of the month')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByText('31')).toBeTruthy();
    });

    it('should call onMonthdaysChange when a day is toggled on', () => {
      render(
        <RecurrencePicker {...defaultProps} type="monthly" monthdays={[]} />,
      );
      fireEvent.press(screen.getByText('15'));
      expect(defaultProps.onMonthdaysChange).toHaveBeenCalledWith([15]);
    });

    it('should call onMonthdaysChange when a day is toggled off', () => {
      render(
        <RecurrencePicker
          {...defaultProps}
          type="monthly"
          monthdays={[1, 15]}
        />,
      );
      fireEvent.press(screen.getByText('1'));
      expect(defaultProps.onMonthdaysChange).toHaveBeenCalledWith([15]);
    });

    it('should select all days when Select all is pressed', () => {
      render(
        <RecurrencePicker {...defaultProps} type="monthly" monthdays={[1, 15]} />,
      );
      fireEvent.press(screen.getByTestId('monthday-select-all'));
      const allDays = Array.from({length: 31}, (_, i) => i + 1);
      expect(defaultProps.onMonthdaysChange).toHaveBeenCalledWith(allDays);
    });

    it('should clear all days when Clear all is pressed', () => {
      render(
        <RecurrencePicker {...defaultProps} type="monthly" monthdays={[1, 15, 31]} />,
      );
      fireEvent.press(screen.getByTestId('monthday-clear-all'));
      expect(defaultProps.onMonthdaysChange).toHaveBeenCalledWith([]);
    });

    it('should not show weekly or interval options', () => {
      render(<RecurrencePicker {...defaultProps} type="monthly" />);
      expect(screen.queryByText('Select days of the week')).toBeNull();
      expect(screen.queryByTestId('interval-input')).toBeNull();
    });
  });

  describe('interval mode', () => {
    it('should show interval input when type is interval', () => {
      render(<RecurrencePicker {...defaultProps} type="interval" interval={3} />);
      expect(screen.getByText('days')).toBeTruthy();
      expect(screen.getByDisplayValue('3')).toBeTruthy();
    });

    it('should call onIntervalChange when value changes', () => {
      render(<RecurrencePicker {...defaultProps} type="interval" interval={1} />);
      fireEvent.changeText(screen.getByTestId('interval-input'), '5');
      expect(defaultProps.onIntervalChange).toHaveBeenCalledWith(5);
    });

    it('should not show weekly or monthly options', () => {
      render(<RecurrencePicker {...defaultProps} type="interval" />);
      expect(screen.queryByText('Select days of the week')).toBeNull();
      expect(screen.queryByText('Select days of the month')).toBeNull();
    });
  });

  describe('error display', () => {
    it('should show error message when provided', () => {
      render(
        <RecurrencePicker
          {...defaultProps}
          error="曜日を1つ以上選択してください"
        />,
      );
      expect(
        screen.getByText('曜日を1つ以上選択してください'),
      ).toBeTruthy();
    });

    it('should not show error when null', () => {
      render(<RecurrencePicker {...defaultProps} error={null} />);
      expect(
        screen.queryByText('曜日を1つ以上選択してください'),
      ).toBeNull();
    });
  });
});
