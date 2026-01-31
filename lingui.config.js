/** @type {import('@lingui/conf').LinguiConfig} */
module.exports = {
  locales: ['en', 'ja'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/src/locale/locales/{locale}/messages',
      include: ['src', 'app'],
    },
  ],
  format: 'po',
  compileNamespace: 'es',
};
