import {describe, expect, it, jest} from '@jest/globals';
import {fetchAllRows} from '../supabase-pagination';

function makeMockQuery(pages: unknown[][]) {
  let callCount = 0;
  return {
    range: jest.fn((_from: number, _to: number) => {
      const page = pages[callCount] ?? [];
      callCount++;
      return Promise.resolve({data: page, error: null});
    }),
  };
}

function makeMockQueryWithError() {
  return {
    range: jest.fn(() =>
      Promise.resolve({data: null, error: {message: 'DB error', code: '500'}}),
    ),
  };
}

describe('fetchAllRows', () => {
  it('1ページ以内のデータを取得', async () => {
    const rows = [{id: 1}, {id: 2}];
    const query = makeMockQuery([rows]);

    const result = await fetchAllRows(query);

    expect(result).toEqual(rows);
    expect(query.range).toHaveBeenCalledTimes(1);
    expect(query.range).toHaveBeenCalledWith(0, 999);
  });

  it('複数ページにまたがるデータを全件取得', async () => {
    // 1000件ちょうど → もう1ページ取得を試みる
    const page1 = Array.from({length: 1000}, (_, i) => ({id: i}));
    const page2 = Array.from({length: 500}, (_, i) => ({id: 1000 + i}));
    const query = makeMockQuery([page1, page2]);

    const result = await fetchAllRows(query);

    expect(result.length).toBe(1500);
    expect(query.range).toHaveBeenCalledTimes(2);
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('空の結果を正しく処理', async () => {
    const query = makeMockQuery([[]]);

    const result = await fetchAllRows(query);

    expect(result).toEqual([]);
    expect(query.range).toHaveBeenCalledTimes(1);
  });

  it('null データを空配列として処理', async () => {
    const query = {
      range: jest.fn(() => Promise.resolve({data: null, error: null})),
    };

    const result = await fetchAllRows(query);

    expect(result).toEqual([]);
  });

  it('エラー時に throw する', async () => {
    const query = makeMockQueryWithError();

    await expect(fetchAllRows(query)).rejects.toEqual({
      message: 'DB error',
      code: '500',
    });
  });
});
