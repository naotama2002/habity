module.exports = {
  preset: 'jest-expo',
  // jest-expo の既定は node 環境だが、Web 専用プロジェクト (CLAUDE.md) であり
  // reanimated の web 実装が document を参照するため jsdom を使う。
  testEnvironment: 'jsdom',
  // react-native-worklets (Reanimated 4) を jest から読めるようにする。
  // 詳細は jest/resolver.js のコメントを参照。
  resolver: './jest/resolver.js',
  setupFilesAfterEnv: [
    './jest/jestSetup.js',
    '@testing-library/react-native/extend-expect',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|((jest-)?react-native|@react-native(-community)?|@react-native/.*)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^#/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
