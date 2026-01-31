import { i18n } from '@lingui/core';
import { AppLanguage, DEFAULT_LANGUAGE } from './languages';

// 翻訳メッセージの型定義
type Messages = Record<string, string>;

// 翻訳メッセージを静的にインポート
// Note: これらのファイルは `pnpm intl:compile` で生成される
import { messages as messagesEn } from './locales/en/messages.mjs';
import { messages as messagesJa } from './locales/ja/messages.mjs';

/**
 * 言語に応じたメッセージを取得
 */
function getMessages(locale: AppLanguage): Messages {
  switch (locale) {
    case AppLanguage.en:
      return messagesEn ?? {};
    case AppLanguage.ja:
      return messagesJa ?? {};
    default:
      return messagesJa ?? {};
  }
}

/**
 * 言語を切り替える
 */
export function activateLanguage(locale: AppLanguage): void {
  const messages = getMessages(locale);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

/**
 * i18n を初期化
 */
export function initI18n(locale?: AppLanguage): void {
  activateLanguage(locale ?? DEFAULT_LANGUAGE);
}

export { i18n };
