/**
 * 配列内のアイテムを fromIndex から toIndex に移動した新しい配列を返す。
 */
export function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...items];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
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
