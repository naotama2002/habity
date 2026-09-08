import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react';
import {Toast} from '@/components/ui/Toast';

/** 自動で消えるまでの時間 (ms) */
export const TOAST_DURATION_MS = 6000;

interface ToastContextValue {
  /** エラーメッセージを表示する（翻訳済み文字列を渡すこと） */
  showError: (message: string) => void;
  /** 表示中のトーストを閉じる */
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * トースト表示のプロバイダー
 *
 * ミューテーションの失敗など、画面遷移を伴わないエラーを利用者に伝えるために使う。
 * 同時に表示するのは 1 件のみで、新しいメッセージは既存のものを置き換える。
 */
export function ToastProvider({children}: {children: React.ReactNode}) {
  const {_} = useLingui();
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setMessage(null);
  }, [clearTimer]);

  const showError = useCallback(
    (next: string) => {
      // 連続して発生した場合は最新のメッセージで置き換える
      clearTimer();
      setMessage(next);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMessage(null);
      }, TOAST_DURATION_MS);
    },
    [clearTimer],
  );

  // アンマウント時にタイマーを解放する
  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(() => ({showError, dismiss}), [showError, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={message}
        onDismiss={dismiss}
        dismissLabel={_(msg`Close`)}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
