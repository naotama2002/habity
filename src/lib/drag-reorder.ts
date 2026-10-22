/**
 * ドラッグ並べ替えの位置計算
 *
 * SortableList の描画から独立した純粋関数として切り出している。
 * (以前は同じ計算がジェスチャ側と自動スクロール側に重複していた)
 */

/**
 * ドラッグ中アイテムの移動量から、挿入先インデックスを求める。
 *
 * @param displacement 元の位置からの移動量 (px, 下方向が正)
 * @param fromIndex    ドラッグ開始時のインデックス
 * @param heights      各アイテムの実測高さ
 * @param count        アイテム総数
 * @param gap          アイテム間の余白
 */
export function calculateTargetIndex(
  displacement: number,
  fromIndex: number,
  heights: number[],
  count: number,
  gap: number,
): number {
  if (displacement === 0) {
    return fromIndex;
  }

  let targetIndex = fromIndex;

  if (displacement > 0) {
    // 下方向: 次のアイテムの中間地点を越えるたびに 1 つ送る
    let accumulated = 0;
    for (let i = fromIndex + 1; i < count; i++) {
      const height = heights[i] || 0;
      accumulated += height + gap;
      if (displacement > accumulated - height / 2) {
        targetIndex = i;
      } else {
        break;
      }
    }
  } else {
    // 上方向
    let accumulated = 0;
    for (let i = fromIndex - 1; i >= 0; i--) {
      const height = heights[i] || 0;
      accumulated -= height + gap;
      if (displacement < accumulated + height / 2) {
        targetIndex = i;
      } else {
        break;
      }
    }
  }

  return targetIndex;
}

/**
 * ドラッグ中でないアイテムが、空きを作るためにずれる量を求める。
 *
 * @param index  対象アイテムのインデックス
 * @param from   ドラッグ開始位置
 * @param to     現在の挿入先
 * @param heights 各アイテムの実測高さ
 * @param gap    アイテム間の余白
 * @returns ずらす量 (px, 下方向が正)
 */
export function calculateShift(
  index: number,
  from: number,
  to: number,
  heights: number[],
  gap: number,
): number {
  if (from === -1 || to === -1 || from === to) {
    return 0;
  }

  const draggedSize = (heights[from] || 0) + gap;

  if (from < to) {
    // 下へドラッグ中: 間のアイテムは上へ詰める
    return index > from && index <= to ? -draggedSize : 0;
  }

  // 上へドラッグ中: 間のアイテムは下へ送る
  return index >= to && index < from ? draggedSize : 0;
}

/**
 * 端に近いときの自動スクロール速度を求める。
 *
 * @param pointerY   ポインタの画面上の Y 座標
 * @param top        コンテナ上端
 * @param bottom     コンテナ下端
 * @param threshold  端とみなす幅
 * @param maxSpeed   最大速度 (px/frame)
 * @returns 速度 (負で上スクロール)。範囲外なら 0
 */
export function calculateAutoScrollSpeed(
  pointerY: number,
  top: number,
  bottom: number,
  threshold: number,
  maxSpeed: number,
): number {
  if (pointerY >= top && pointerY < top + threshold) {
    const factor = 1 - (pointerY - top) / threshold;
    return -maxSpeed * Math.max(0, factor);
  }
  if (pointerY <= bottom && pointerY > bottom - threshold) {
    const factor = 1 - (bottom - pointerY) / threshold;
    return maxSpeed * Math.max(0, factor);
  }
  return 0;
}
