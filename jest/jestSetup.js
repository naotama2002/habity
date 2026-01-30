/* global jest */
import 'react-native-gesture-handler/jestSetup';

/**
 * Jest Setup for Habity
 *
 * モック方針:
 * - React Native のネイティブ機能のみモック
 * - 外部 API (Supabase) は実際のテストで必要な場合のみモック
 * - ユーティリティ関数やロジックはモックしない
 */

// SafeAreaContext - React Native のレイアウト機能
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  };
});

// expo-secure-store - ネイティブのセキュアストレージ
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// expo-constants - アプリ設定
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'http://localhost:54321',
      supabaseAnonKey: 'test-anon-key',
    },
  },
}));

// expo-linking - URL ハンドリング
jest.mock('expo-linking', () => ({
  createURL: jest.fn().mockImplementation((path) => `habity://${path}`),
}));
