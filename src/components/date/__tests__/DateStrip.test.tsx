import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {format, addDays} from 'date-fns';
import {DateStrip} from '../DateStrip';

// ScrollView scrollTo mock
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const RealScrollView = jest.requireActual(
    'react-native/Libraries/Components/ScrollView/ScrollView',
  ) as React.ComponentType;
  return RealScrollView;
});

describe('DateStrip', () => {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render 9 date items', () => {
    render(<DateStrip selectedDate={todayStr} onSelectDate={jest.fn()} />);

    // 9 days: 7 past + today + 1 future
    for (let i = -7; i <= 1; i++) {
      const date = addDays(today, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      expect(screen.getByTestId(`date-item-${dateKey}`)).toBeTruthy();
    }
  });

  it('should show "Today" label on today item', () => {
    render(<DateStrip selectedDate={todayStr} onSelectDate={jest.fn()} />);

    expect(screen.getByTestId('date-today-label')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('should call onSelectDate when a date item is pressed', () => {
    const onSelectDate = jest.fn();
    render(
      <DateStrip selectedDate={todayStr} onSelectDate={onSelectDate} />,
    );

    const yesterday = addDays(today, -1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    fireEvent.press(screen.getByTestId(`date-item-${yesterdayStr}`));

    expect(onSelectDate).toHaveBeenCalledWith(yesterdayStr);
  });

  it('should render the date-strip container', () => {
    render(<DateStrip selectedDate={todayStr} onSelectDate={jest.fn()} />);
    expect(screen.getByTestId('date-strip')).toBeTruthy();
  });

  it('should display day of month for each date', () => {
    render(<DateStrip selectedDate={todayStr} onSelectDate={jest.fn()} />);

    const todayDay = format(today, 'd');
    expect(screen.getByText(todayDay)).toBeTruthy();
  });
});
