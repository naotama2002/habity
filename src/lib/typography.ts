import { TextStyle, Platform } from 'react-native';

/**
 * タイポグラフィ
 * docs/04-ui-design.md を参照
 */

// フォントファミリー（プラットフォーム別）
const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'System',
});

/**
 * フォントウェイト定義
 */
export const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

/**
 * テキストスタイル定義
 */
export const typography = {
  // 見出し
  h1: {
    fontFamily,
    fontSize: 32,
    fontWeight: fontWeights.bold,
    lineHeight: 40,
  } as TextStyle,

  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: fontWeights.semibold,
    lineHeight: 32,
  } as TextStyle,

  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: fontWeights.semibold,
    lineHeight: 28,
  } as TextStyle,

  h4: {
    fontFamily,
    fontSize: 18,
    fontWeight: fontWeights.semibold,
    lineHeight: 24,
  } as TextStyle,

  // 本文
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  } as TextStyle,

  bodyMedium: {
    fontFamily,
    fontSize: 16,
    fontWeight: fontWeights.medium,
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: fontWeights.regular,
    lineHeight: 20,
  } as TextStyle,

  bodySmallMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: fontWeights.medium,
    lineHeight: 20,
  } as TextStyle,

  // キャプション
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: fontWeights.regular,
    lineHeight: 16,
  } as TextStyle,

  captionMedium: {
    fontFamily,
    fontSize: 12,
    fontWeight: fontWeights.medium,
    lineHeight: 16,
  } as TextStyle,

  // ボタン
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: fontWeights.semibold,
    lineHeight: 24,
  } as TextStyle,

  buttonSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
  } as TextStyle,

  // 数値（ストリーク等）
  number: {
    fontFamily,
    fontSize: 14,
    fontWeight: fontWeights.bold,
    lineHeight: 20,
  } as TextStyle,

  numberLarge: {
    fontFamily,
    fontSize: 24,
    fontWeight: fontWeights.bold,
    lineHeight: 32,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
