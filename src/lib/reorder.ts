/**
 * 配列内のアイテムを1つ上(前)に移動した新しい配列を返す。
 * index が 0 以下の場合は元の配列のコピーを返す。
 */
export function moveUp<T>(items: T[], index: number): T[] {
  if (index <= 0 || index >= items.length) return [...items];
  const result = [...items];
  [result[index - 1], result[index]] = [result[index], result[index - 1]];
  return result;
}

/**
 * 配列内のアイテムを1つ下(後)に移動した新しい配列を返す。
 * index が末尾以上の場合は元の配列のコピーを返す。
 */
export function moveDown<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) return [...items];
  const result = [...items];
  [result[index], result[index + 1]] = [result[index + 1], result[index]];
  return result;
}

/**
 * 並べ替え後の配列から { id, sort_order } のペアを生成。
 * sort_order は 0, 1, 2, ... の連番。
 */
export function buildSortOrderUpdates(
  items: { id: string }[],
): { id: string; sort_order: number }[] {
  return items.map((item, index) => ({
    id: item.id,
    sort_order: index,
  }));
}
