import { formatter } from '@lingui/format-po';

/** @type {import('@lingui/conf').LinguiConfig} */
export default {
  locales: ['en', 'ja'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/src/locale/locales/{locale}/messages',
      include: ['src', 'app'],
      // テスト内の msg`...` はアプリの UI 文字列ではないため抽出しない
      exclude: ['**/node_modules/**', '**/__tests__/**', '**/*.test.{ts,tsx}'],
    },
  ],
  format: formatter(),
  compileNamespace: 'es',
};
