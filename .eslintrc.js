module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    // eslint-plugin-react-hooks v6 以降、recommended に React Compiler 向けの
    // ルールが含まれる。本プロジェクトは React Compiler を使っていない
    // (babel.config.js / app.config.js とも未設定)。
    //
    // また Reanimated の shared value 代入 (sharedValue.value = x) は
    // ライブラリの正規 API だが immutability に一律で弾かれる
    // (SortableList だけで 23 件)。誤検知のため無効化する。
    //
    // 一方 set-state-in-effect / refs は実際の不具合を拾えるため有効のまま残す。
    'react-hooks/immutability': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'build/',
    'coverage/',
    '*.config.js',
  ],
};
