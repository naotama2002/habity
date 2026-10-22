import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '@/lib/colors';
import { spacing, shadows } from '@/lib/spacing';
import { reorder } from '@/lib/reorder';
import {
  calculateAutoScrollSpeed,
  calculateShift,
  calculateTargetIndex,
} from '@/lib/drag-reorder';

interface SortableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onReorder: (newData: T[]) => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

const EDGE_THRESHOLD = 60;
const MAX_AUTO_SCROLL_SPEED = 8;
const SHIFT_DURATION = 200;

/**
 * ドラッグ中の状態。ドラッグしていないときは null。
 *
 * shifts は「他のアイテムが空きを作るためにずれる量」を index 順に持つ。
 * 実測高さ (ref) から計算する必要があるが、描画中に ref を読まないよう
 * 挿入先が変わったタイミング (イベント/RAF) で計算して state に入れる。
 */
interface DragState {
  from: number;
  to: number;
  shifts: number[];
}

function SortableItem<T>({
  item,
  index,
  renderItem,
  isDragging,
  shift,
  dragTranslate,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMeasure,
}: {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => ReactNode;
  isDragging: boolean;
  shift: number;
  dragTranslate: Animated.Value;
  onDragStart: (index: number, pageY: number) => void;
  onDragMove: (pageY: number) => void;
  onDragEnd: (commit: boolean) => void;
  onMeasure: (index: number, height: number) => void;
}) {
  const [shiftAnim] = useState(() => new Animated.Value(shift));

  useEffect(() => {
    if (isDragging) {
      return;
    }
    const animation = Animated.timing(shiftAnim, {
      toValue: shift,
      duration: SHIFT_DURATION,
      useNativeDriver: true,
    });
    animation.start();
    // アンマウント後にアニメーションが走り続けないよう停止する
    return () => animation.stop();
  }, [shift, shiftAnim, isDragging]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onMeasure(index, event.nativeEvent.layout.height);
    },
    [index, onMeasure],
  );

  const animatedStyle = isDragging
    ? {
        transform: [{ translateY: dragTranslate }, { scale: 1.03 }],
        zIndex: 999,
        opacity: 0.9,
        ...shadows.sm,
      }
    : {
        transform: [{ translateY: shiftAnim }],
        zIndex: 0,
        opacity: 1,
      };

  return (
    <Animated.View style={animatedStyle} onLayout={handleLayout}>
      <View style={styles.sortableItem}>
        <View style={styles.itemContent}>{renderItem(item, index)}</View>
        <View
          style={styles.gripHandle}
          accessibilityRole="button"
          accessibilityLabel="Reorder"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event: GestureResponderEvent) =>
            onDragStart(index, event.nativeEvent.pageY)
          }
          onResponderMove={(event: GestureResponderEvent) =>
            onDragMove(event.nativeEvent.pageY)
          }
          onResponderRelease={() => onDragEnd(true)}
          onResponderTerminate={() => onDragEnd(false)}
        >
          <Ionicons
            name="reorder-three"
            size={24}
            color={lightTheme.textTertiary}
          />
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * ドラッグで並べ替えできるリスト
 *
 * Web 専用プロジェクトのため、React Native コアの Animated / PanResponder
 * だけで実装している。reanimated / gesture-handler はネイティブ UI スレッドで
 * アニメーションを動かすための仕組みであり、そのスレッドが存在しない Web では
 * 利点がない一方、ビルド・テスト基盤に継続的な負担を強いていた。
 */
export function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  style,
  contentContainerStyle,
}: SortableListProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const itemHeights = useRef<number[]>([]);

  // ドラッグ中に毎フレーム変わる値。再描画を避けるため ref / Animated.Value に置く
  const [dragTranslate] = useState(() => new Animated.Value(0));
  const fingerTranslation = useRef(0);
  const scrollCompensation = useRef(0);
  const autoScrollSpeed = useRef(0);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);
  const containerTop = useRef(0);
  const dragStartPageY = useRef(0);
  const rafId = useRef<number | null>(null);

  // 挿入先が変わったときだけ再描画する
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // 描画中に ref を書かないよう、最新の data は effect で同期する
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /** 挿入先から各アイテムのずれ量を組み立てる */
  const buildDragState = useCallback((from: number, to: number): DragState => {
    const heights = itemHeights.current;
    const shifts = dataRef.current.map((_item, index) =>
      calculateShift(index, from, to, heights, spacing.sm),
    );
    return { from, to, shifts };
  }, []);

  const applyDragState = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const handleMeasure = useCallback((index: number, height: number) => {
    itemHeights.current[index] = height;
  }, []);

  /** ドラッグ中の移動量から挿入先を再計算する */
  const updateTargetIndex = useCallback(() => {
    const current = dragRef.current;
    if (!current) {
      return;
    }
    const displacement = fingerTranslation.current + scrollCompensation.current;
    const to = calculateTargetIndex(
      displacement,
      current.from,
      itemHeights.current,
      dataRef.current.length,
      spacing.sm,
    );
    if (to !== current.to) {
      applyDragState(buildDragState(current.from, to));
    }
  }, [applyDragState, buildDragState]);

  const stopAutoScroll = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    autoScrollSpeed.current = 0;
  }, []);

  /** 端に寄っている間、毎フレームスクロールを進める */
  const startAutoScroll = useCallback(() => {
    // 自己参照のため関数宣言にする (const だと初期化前参照になる)
    function step() {
      rafId.current = null;

      const speed = autoScrollSpeed.current;
      const maxScroll = contentHeight.current - containerHeight.current;
      if (speed !== 0 && maxScroll > 0) {
        const next = Math.max(
          0,
          Math.min(scrollOffset.current + speed, maxScroll),
        );
        const delta = next - scrollOffset.current;
        if (delta !== 0) {
          scrollOffset.current = next;
          scrollRef.current?.scrollTo({ y: next, animated: false });
          // スクロールした分だけ指との相対位置がずれるので補正する
          scrollCompensation.current += delta;
          dragTranslate.setValue(
            fingerTranslation.current + scrollCompensation.current,
          );
          updateTargetIndex();
        }
      }

      if (dragRef.current) {
        rafId.current = requestAnimationFrame(step);
      }
    }

    rafId.current = requestAnimationFrame(step);
  }, [dragTranslate, updateTargetIndex]);

  const endDrag = useCallback(
    (commit: boolean) => {
      const current = dragRef.current;
      stopAutoScroll();
      if (!current) {
        return;
      }

      applyDragState(null);
      fingerTranslation.current = 0;
      scrollCompensation.current = 0;
      dragTranslate.setValue(0);

      const { from, to } = current;
      const items = dataRef.current;
      if (
        commit &&
        from !== to &&
        from >= 0 &&
        to >= 0 &&
        from < items.length &&
        to < items.length
      ) {
        onReorder(reorder(items, from, to));
      }
    },
    [applyDragState, dragTranslate, onReorder, stopAutoScroll],
  );

  /** グリップに触れた時点でドラッグを開始する */
  const handleDragStart = useCallback(
    (index: number, pageY: number) => {
      dragStartPageY.current = pageY;
      fingerTranslation.current = 0;
      scrollCompensation.current = 0;
      dragTranslate.setValue(0);
      applyDragState(buildDragState(index, index));

      // 端の自動スクロール判定はページ座標と比較するため絶対位置を測る
      scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x, y) => {
        containerTop.current = y;
      });

      startAutoScroll();
    },
    [applyDragState, buildDragState, dragTranslate, startAutoScroll],
  );

  const handleDragMove = useCallback(
    (pageY: number) => {
      const dy = pageY - dragStartPageY.current;
      fingerTranslation.current = dy;
      dragTranslate.setValue(dy + scrollCompensation.current);
      updateTargetIndex();

      autoScrollSpeed.current = calculateAutoScrollSpeed(
        pageY,
        containerTop.current,
        containerTop.current + containerHeight.current,
        EDGE_THRESHOLD,
        MAX_AUTO_SCROLL_SPEED,
      );
    },
    [dragTranslate, updateTargetIndex],
  );

  // アンマウント時に RAF を解放する
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerHeight.current = event.nativeEvent.layout.height;
  }, []);

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeight.current = h;
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      scrollEnabled={drag === null}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onLayout={handleContainerLayout}
      onContentSizeChange={handleContentSizeChange}
    >
      <View style={styles.container}>
        {data.map((item, index) => (
          <SortableItem
            key={keyExtractor(item)}
            item={item}
            index={index}
            renderItem={renderItem}
            isDragging={drag?.from === index}
            shift={drag?.shifts[index] ?? 0}
            dragTranslate={dragTranslate}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={endDrag}
            onMeasure={handleMeasure}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sortableItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  gripHandle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
});
