/**
 * アプリでサポートする言語
 */
export enum AppLanguage {
  en = 'en',
  ja = 'ja',
}

/**
 * 言語情報
 */
export interface LanguageInfo {
  code: AppLanguage;
  name: string; // 英語での言語名
  nativeName: string; // ネイティブの言語名
}

/**
 * サポートする言語の一覧
 */
export const APP_LANGUAGES: LanguageInfo[] = [
  { code: AppLanguage.en, name: 'English', nativeName: 'English' },
  { code: AppLanguage.ja, name: 'Japanese', nativeName: '日本語' },
];

/**
 * デフォルト言語
 */
export const DEFAULT_LANGUAGE = AppLanguage.ja;

/**
 * 言語コードが有効かチェック
 */
export function isValidLanguage(code: string): code is AppLanguage {
  return Object.values(AppLanguage).includes(code as AppLanguage);
}

/**
 * 言語コードを正規化（無効な場合はデフォルト言語を返す）
 */
export function sanitizeLanguage(code: string | null | undefined): AppLanguage {
  if (code && isValidLanguage(code)) {
    return code;
  }
  return DEFAULT_LANGUAGE;
}
