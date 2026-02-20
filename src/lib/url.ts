/**
 * URL extraction utilities
 */

const URL_PATTERN = /\S*:\/\/\S+/g;

/**
 * description テキストからすべてのURLを抽出。見つからなければ空配列
 */
export function extractUrls(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(URL_PATTERN);
  return matches ?? [];
}
