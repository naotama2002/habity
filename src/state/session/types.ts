import type { Session, User } from '@supabase/supabase-js';

/**
 * セッション状態の型定義
 * Bluesky の SessionStateContext を参考に設計
 */
export interface SessionState {
  /** 現在のセッション */
  session: Session | null;
  /** 現在のユーザー */
  user: User | null;
  /** セッションが存在するかどうか */
  hasSession: boolean;
  /** ローディング中かどうか */
  isLoading: boolean;
  /** 初期化が完了したかどうか */
  isInitialized: boolean;
}

/**
 * セッション操作APIの型定義
 * Bluesky の SessionApiContext を参考に設計
 */
export interface SessionApi {
  /** Google でサインイン */
  signInWithGoogle: () => Promise<void>;
  /** メール/パスワードでサインイン */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** メール/パスワードでサインアップ */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  /** サインアウト */
  signOut: () => Promise<void>;
  /** セッションをリフレッシュ */
  refreshSession: () => Promise<void>;
}

/**
 * 初期状態
 */
export const initialSessionState: SessionState = {
  session: null,
  user: null,
  hasSession: false,
  isLoading: true,
  isInitialized: false,
};
