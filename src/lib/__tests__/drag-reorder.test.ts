import {describe, expect, it} from '@jest/globals';
import {
  calculateTargetIndex,
  calculateShift,
  calculateAutoScrollSpeed,
} from '../drag-reorder';

// 高さ 100px・余白 10px で揃えた 5 件を基本形とする
const HEIGHTS = [100, 100, 100, 100, 100];
const GAP = 10;
const COUNT = 5;

const targetIndex = (displacement: number, from: number) =>
  calculateTargetIndex(displacement, from, HEIGHTS, COUNT, GAP);

describe('calculateTargetIndex', () => {
  it('動いていなければ元の位置', () => {
    expect(targetIndex(0, 2)).toBe(2);
  });

  describe('下方向', () => {
    // 1 つ送るのに必要な移動量は (高さ + 余白) - 高さ/2 = 110 - 50 = 60px
    it.each([
      [59, 2, '中間地点の手前なら動かない'],
      [61, 2, '中間地点を越えたら 1 つ送る'],
      [171, 2, 'さらに越えたら 2 つ送る'],
    ])('移動量 %ipx (from=%i): %s', (displacement, from) => {
      const result = targetIndex(displacement, from);
      expect(result).toBe(
        displacement < 60 ? from : displacement < 170 ? from + 1 : from + 2,
      );
    });

    it('末尾を越えて進まない', () => {
      expect(targetIndex(10000, 2)).toBe(COUNT - 1);
    });
  });

  describe('上方向', () => {
    it.each([
      [-59, 2, 2],
      [-61, 2, 1],
      [-171, 2, 0],
    ])('移動量 %ipx (from=%i) -> %i', (displacement, from, expected) => {
      expect(targetIndex(displacement, from)).toBe(expected);
    });

    it('先頭を越えて戻らない', () => {
      expect(targetIndex(-10000, 2)).toBe(0);
    });
  });

  it('高さがまだ実測されていなくても落ちない', () => {
    expect(calculateTargetIndex(100, 0, [], COUNT, GAP)).toBeGreaterThanOrEqual(0);
  });

  it('高さがばらばらでも各アイテムの実寸で判定する', () => {
    // from=0 の下に 高さ20 と 高さ200 が並ぶ
    const heights = [50, 20, 200];
    // 1 つ送るのに必要なのは (20+10) - 10 = 20px
    expect(calculateTargetIndex(21, 0, heights, 3, GAP)).toBe(1);
    // 2 つ送るのに必要なのは 30+210 - 100 = 140px
    expect(calculateTargetIndex(139, 0, heights, 3, GAP)).toBe(1);
    expect(calculateTargetIndex(141, 0, heights, 3, GAP)).toBe(2);
  });
});

describe('calculateShift', () => {
  it('ドラッグしていなければ動かさない', () => {
    expect(calculateShift(1, -1, -1, HEIGHTS, GAP)).toBe(0);
  });

  it('移動先が元の位置と同じなら動かさない', () => {
    expect(calculateShift(1, 2, 2, HEIGHTS, GAP)).toBe(0);
  });

  describe('下へドラッグ中 (from=1, to=3)', () => {
    it.each([
      [0, 0, '範囲外は動かない'],
      [1, 0, 'ドラッグ中の本人は対象外'],
      [2, -110, '間のアイテムは上へ詰める'],
      [3, -110, '移動先も上へ詰める'],
      [4, 0, '範囲外は動かない'],
    ])('index=%i -> %ipx (%s)', (index, expected) => {
      expect(calculateShift(index, 1, 3, HEIGHTS, GAP)).toBe(expected);
    });
  });

  describe('上へドラッグ中 (from=3, to=1)', () => {
    it.each([
      [0, 0],
      [1, 110],
      [2, 110],
      [3, 0],
      [4, 0],
    ])('index=%i -> %ipx', (index, expected) => {
      expect(calculateShift(index, 3, 1, HEIGHTS, GAP)).toBe(expected);
    });
  });
});

describe('calculateAutoScrollSpeed', () => {
  const TOP = 100;
  const BOTTOM = 500;
  const THRESHOLD = 60;
  const MAX = 8;

  const speed = (y: number) =>
    calculateAutoScrollSpeed(y, TOP, BOTTOM, THRESHOLD, MAX);

  it('中央付近では 0', () => {
    expect(speed(300)).toBe(0);
  });

  it('上端に近いほど速く上へスクロールする', () => {
    expect(speed(TOP)).toBe(-MAX);
    expect(speed(TOP + 30)).toBeCloseTo(-MAX / 2);
    expect(speed(TOP + 59)).toBeLessThan(0);
    expect(speed(TOP + 60)).toBe(0);
  });

  it('下端に近いほど速く下へスクロールする', () => {
    expect(speed(BOTTOM)).toBe(MAX);
    expect(speed(BOTTOM - 30)).toBeCloseTo(MAX / 2);
    expect(speed(BOTTOM - 59)).toBeGreaterThan(0);
    expect(speed(BOTTOM - 60)).toBe(0);
  });

  it('コンテナの外では 0', () => {
    expect(speed(TOP - 1)).toBe(0);
    expect(speed(BOTTOM + 1)).toBe(0);
  });
});
