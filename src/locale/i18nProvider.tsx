import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n, initI18n } from './i18n';
import { DEFAULT_LANGUAGE } from './languages';

interface I18nProviderProps {
  children: React.ReactNode;
}

let initialized = false;

/**
 * i18n を一度だけ初期化する
 *
 * initI18n は同期処理なので、effect + setState で「準備完了」を待つ必要がない。
 * effect にすると初回に null を返す余分な描画が挟まり、
 * react-hooks/set-state-in-effect にも抵触する。
 */
function ensureI18nInitialized(): void {
  if (initialized) {
    return;
  }
  // TODO: ユーザーの言語設定を読み込む
  // 現在はデフォルト言語を使用
  initI18n(DEFAULT_LANGUAGE);
  initialized = true;
}

/** テスト用に初期化状態を戻す */
export function resetI18nInitializedForTest(): void {
  initialized = false;
}

/**
 * i18n プロバイダー
 * アプリ全体で翻訳機能を提供
 */
export function I18nProvider({ children }: I18nProviderProps) {
  ensureI18nInitialized();

  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
}
