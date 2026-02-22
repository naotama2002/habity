/**
 * Supabase ページネーションユーティリティ
 *
 * Supabase (PostgREST) はデフォルトで最大 1000 行しか返さない。
 * この関数は .range() を使って全行を取得する。
 */

/** Supabase のデフォルト行数制限 */
const PAGE_SIZE = 1000;

type SupabaseQueryLike<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
};

/**
 * Supabase クエリの結果を全件取得（ページネーション）
 *
 * @example
 * const rows = await fetchAllRows(
 *   supabase.from('habit_logs')
 *     .select('*')
 *     .eq('habit_id', id)
 *     .order('target_date', { ascending: false })
 * );
 */
export async function fetchAllRows<T>(
  query: SupabaseQueryLike<T>,
): Promise<T[]> {
  const allRows: T[] = [];
  let rangeStart = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(
      rangeStart,
      rangeStart + PAGE_SIZE - 1,
    );

    if (error) throw error;

    allRows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      rangeStart += PAGE_SIZE;
    }
  }

  return allRows;
}
