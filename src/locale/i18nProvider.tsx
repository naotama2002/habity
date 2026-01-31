import { useEffect, useState } from 'react';
import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n, initI18n } from './i18n';
import { DEFAULT_LANGUAGE } from './languages';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * i18n プロバイダー
 * アプリ全体で翻訳機能を提供
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // TODO: ユーザーの言語設定を読み込む
    // 現在はデフォルト言語を使用
    initI18n(DEFAULT_LANGUAGE);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
}
