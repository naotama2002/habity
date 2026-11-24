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

async function renderWithProvider(ui: React.ReactElement) {
  return await render(<ToastProvider>{ui}</ToastProvider>);
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初期状態ではトーストを表示しない', async () => {
    await renderWithProvider(<Trigger message="エラー" />);

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('showError でトーストを表示する', async () => {
    await renderWithProvider(<Trigger message="記録に失敗しました" />);

    await fireEvent.press(screen.getByTestId('trigger'));

    expect(screen.getByTestId('toast')).toBeTruthy();
    expect(screen.getByText('記録に失敗しました')).toBeTruthy();
  });

  it('一定時間経過で自動的に消える', async () => {
    await renderWithProvider(<Trigger message="エラー" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.queryByTestId('toast')).toBeTruthy();

    await act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('自動消去の直前ではまだ表示されている', async () => {
    await renderWithProvider(<Trigger message="エラー" />);
    await fireEvent.press(screen.getByTestId('trigger'));

    await act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS - 1);
    });

    expect(screen.queryByTestId('toast')).toBeTruthy();
  });

  it('タップで閉じられる', async () => {
    await renderWithProvider(<Trigger message="エラー" />);
    await fireEvent.press(screen.getByTestId('trigger'));

    await fireEvent.press(screen.getByTestId('toast'));

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('連続表示は最新メッセージで置き換わり、タイマーも延長される', async () => {
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
    await render(
      <ToastProvider>
        <DoubleTrigger />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByTestId('first'));
    await act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS - 100);
    });

    // 1つ目の消去直前に2つ目を出す
    await fireEvent.press(screen.getByTestId('second'));
    expect(screen.getByText('2つ目')).toBeTruthy();
    expect(screen.queryByText('1つ目')).toBeNull();

    // 1つ目のタイマーで消えてしまわないこと
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId('toast')).toBeTruthy();

    await act(() => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('Provider の外で useToast を使うとエラーになる', async () => {
    function Outside() {
      useToast();
      return null;
    }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // RNTL 14 で render は非同期になった。描画中の throw は render() 呼び出し時に
    // 同期的に飛ぶことも Promise の reject になることもあるため、async 関数で
    // 包んで必ず reject として観測する。
    await expect(async () => {
      await render(<Outside />);
    }).rejects.toThrow('useToast must be used within a ToastProvider');

    spy.mockRestore();
  });
});
