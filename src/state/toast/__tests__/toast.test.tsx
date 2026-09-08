import {describe, expect, it, jest, beforeEach, afterEach} from '@jest/globals';
import {Text, Pressable} from 'react-native';
import {render, screen, fireEvent, act} from '@testing-library/react-native';
import {ToastProvider, useToast, TOAST_DURATION_MS} from '../index';

/** showError を任意のメッセージで呼べるテスト用コンポーネント */
function Trigger({message}: {message: string}) {
  const {showError} = useToast();
  return (
    <Pressable testID="trigger" onPress={() => showError(message)}>
      <Text>trigger</Text>
    </Pressable>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初期状態ではトーストを表示しない', () => {
    renderWithProvider(<Trigger message="エラー" />);

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('showError でトーストを表示する', () => {
    renderWithProvider(<Trigger message="記録に失敗しました" />);

    fireEvent.press(screen.getByTestId('trigger'));

    expect(screen.getByTestId('toast')).toBeTruthy();
    expect(screen.getByText('記録に失敗しました')).toBeTruthy();
  });

  it('一定時間経過で自動的に消える', () => {
    renderWithProvider(<Trigger message="エラー" />);
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.queryByTestId('toast')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('自動消去の直前ではまだ表示されている', () => {
    renderWithProvider(<Trigger message="エラー" />);
    fireEvent.press(screen.getByTestId('trigger'));

    act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS - 1);
    });

    expect(screen.queryByTestId('toast')).toBeTruthy();
  });

  it('タップで閉じられる', () => {
    renderWithProvider(<Trigger message="エラー" />);
    fireEvent.press(screen.getByTestId('trigger'));

    fireEvent.press(screen.getByTestId('toast'));

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('連続表示は最新メッセージで置き換わり、タイマーも延長される', () => {
    function DoubleTrigger() {
      const {showError} = useToast();
      return (
        <>
          <Pressable testID="first" onPress={() => showError('1つ目')}>
            <Text>1</Text>
          </Pressable>
          <Pressable testID="second" onPress={() => showError('2つ目')}>
            <Text>2</Text>
          </Pressable>
        </>
      );
    }
    render(
      <ToastProvider>
        <DoubleTrigger />
      </ToastProvider>,
    );

    fireEvent.press(screen.getByTestId('first'));
    act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS - 100);
    });

    // 1つ目の消去直前に2つ目を出す
    fireEvent.press(screen.getByTestId('second'));
    expect(screen.getByText('2つ目')).toBeTruthy();
    expect(screen.queryByText('1つ目')).toBeNull();

    // 1つ目のタイマーで消えてしまわないこと
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId('toast')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('Provider の外で useToast を使うとエラーになる', () => {
    function Outside() {
      useToast();
      return null;
    }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Outside />)).toThrow(
      'useToast must be used within a ToastProvider',
    );

    spy.mockRestore();
  });
});
