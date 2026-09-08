import {describe, expect, it, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Toast} from '../Toast';

describe('Toast', () => {
  it('message が null のときは何も描画しない', () => {
    render(<Toast message={null} onDismiss={jest.fn()} dismissLabel="Close" />);

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('message を表示する', () => {
    render(
      <Toast message="保存に失敗しました" onDismiss={jest.fn()} dismissLabel="Close" />,
    );

    expect(screen.getByTestId('toast')).toBeTruthy();
    expect(screen.getByText('保存に失敗しました')).toBeTruthy();
  });

  it('閉じるラベルを表示する', () => {
    render(<Toast message="エラー" onDismiss={jest.fn()} dismissLabel="閉じる" />);

    expect(screen.getByText('閉じる')).toBeTruthy();
  });

  it('タップで onDismiss を呼ぶ', () => {
    const onDismiss = jest.fn();
    render(<Toast message="エラー" onDismiss={onDismiss} dismissLabel="Close" />);

    fireEvent.press(screen.getByTestId('toast'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('スクリーンリーダー向けに alert として通知する', () => {
    render(<Toast message="エラー" onDismiss={jest.fn()} dismissLabel="Close" />);

    const toast = screen.getByTestId('toast');
    expect(toast.props.accessibilityRole).toBe('alert');
    expect(toast.props.accessibilityLabel).toBe('エラー');
  });
});
