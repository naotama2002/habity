/**
 * カラーパレット
 * docs/04-ui-design.md を参照
 */

export const colors = {
  // Primary (Indigo)
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // メインカラー
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Success (Green) - 完了
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Warning (Amber) - 進行中
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error (Red)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Gray (テキスト、背景)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Streak (Orange) - 炎
  streak: '#f97316',

  // 基本色
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * ライトモードテーマ
 */
export const lightTheme = {
  background: colors.white,
  surface: colors.gray[50],
  surfaceSecondary: colors.gray[100],
  text: colors.gray[900],
  textSecondary: colors.gray[600],
  textTertiary: colors.gray[400],
  border: colors.gray[200],
  borderLight: colors.gray[100],
  primary: colors.primary[500],
  primaryLight: colors.primary[100],
  success: colors.success[500],
  warning: colors.warning[500],
  error: colors.error[500],
  streak: colors.streak,
} as const;

/**
 * ダークモードテーマ
 */
export const darkTheme = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceSecondary: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  primary: colors.primary[400],
  primaryLight: colors.primary[900],
  success: colors.success[400],
  warning: colors.warning[400],
  error: colors.error[400],
  streak: colors.streak,
} as const;

export type Theme = typeof lightTheme;
