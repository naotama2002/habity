import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import {
  SessionState,
  SessionApi,
  initialSessionState,
} from './types';

/**
 * セッション状態 Context
 */
const SessionStateContext = createContext<SessionState>(initialSessionState);

/**
 * セッション操作 API Context
 */
const SessionApiContext = createContext<SessionApi | null>(null);

/**
 * SessionProvider Props
 */
interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * セッション管理 Provider
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>(initialSessionState);

  /**
   * 状態を更新するヘルパー関数
   */
  const updateState = useCallback((session: Session | null) => {
    setState({
      session,
      user: session?.user ?? null,
      hasSession: !!session,
      isLoading: false,
      isInitialized: true,
    });
  }, []);

  /**
   * 初期セッションの取得と認証状態の監視
   */
  useEffect(() => {
    // 初期セッションを取得
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        updateState(session);
      } catch (error) {
        console.error('Failed to get initial session:', error);
        updateState(null);
      }
    };

    initializeSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event);
        updateState(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [updateState]);

  /**
   * Google でサインイン
   */
  const signInWithGoogle = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const redirectUri = Linking.createURL('auth/callback');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google sign in error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * メール/パスワードでサインイン
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Email sign in error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * メール/パスワードでサインアップ
   */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Email sign up error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * サインアウト
   */
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * セッションをリフレッシュ
   */
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      updateState(session);
    } catch (error) {
      console.error('Session refresh error:', error);
      throw error;
    }
  }, [updateState]);

  /**
   * API コンテキストの値をメモ化
   */
  const api = useMemo<SessionApi>(() => ({
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshSession,
  }), [signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshSession]);

  return (
    <SessionStateContext.Provider value={state}>
      <SessionApiContext.Provider value={api}>
        {children}
      </SessionApiContext.Provider>
    </SessionStateContext.Provider>
  );
}

/**
 * セッション状態を取得するフック
 */
export function useSession(): SessionState {
  return useContext(SessionStateContext);
}

/**
 * セッション操作 API を取得するフック
 */
export function useSessionApi(): SessionApi {
  const api = useContext(SessionApiContext);
  if (!api) {
    throw new Error('useSessionApi must be used within a SessionProvider');
  }
  return api;
}

/**
 * 認証が必要な操作をラップするフック
 */
export function useRequireAuth() {
  const { hasSession } = useSession();

  return useCallback(
    (fn: () => void) => {
      if (hasSession) {
        fn();
      } else {
        // 認証が必要な場合の処理（後で実装）
        console.warn('Authentication required');
      }
    },
    [hasSession]
  );
}

// 型のエクスポート
export type { SessionState, SessionApi } from './types';
