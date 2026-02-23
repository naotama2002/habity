/**
 * URL utilities
 */

const URL_PATTERN = /\S*:\/\/\S+/g;

/**
 * returnTo パラメータを安全なパスに変換する。
 * オープンリダイレクト攻撃を防ぐため、"/" で始まる相対パスのみ許可し、
 * プロトコル付き URL や "//" で始まるパスは拒否する。
 */
export function sanitizeReturnTo(
  returnTo: string | undefined,
  fallback: string = '/(tabs)',
): string {
  if (!returnTo) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(returnTo);
  } catch {
    return fallback;
  }

  // "/" で始まり "//" ではない、かつプロトコルを含まない相対パスのみ許可
  if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
    return decoded;
  }

  return fallback;
}

/**
 * description テキストからすべてのURLを抽出。見つからなければ空配列
 */
export function extractUrls(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(URL_PATTERN);
  return matches ?? [];
}
