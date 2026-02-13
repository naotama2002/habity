import { type ReactNode, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  measure,
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '@/lib/colors';
import { spacing, shadows } from '@/lib/spacing';
import { reorder } from '@/lib/reorder';

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
const TIMING_CONFIG = { duration: 200 };

function SortableItem<T>({
  item,
  index,
  itemCount,
  renderItem,
  itemHeights,
  activeOriginalIndex,
  activeIndex,
  fingerTranslation,
  scrollCompensation,
  autoScrollSpeed,
  scrollRef,
  containerTop,
  containerBottom,
  onDragStart,
  onDragEnd,
  onScrollEnable,
}: {
  item: T;
  index: number;
  itemCount: number;
  renderItem: (item: T, index: number) => ReactNode;
  itemHeights: React.MutableRefObject<number[]>;
  activeOriginalIndex: SharedValue<number>;
  activeIndex: SharedValue<number>;
  fingerTranslation: SharedValue<number>;
  scrollCompensation: SharedValue<number>;
  autoScrollSpeed: SharedValue<number>;
  scrollRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  containerTop: SharedValue<number>;
  containerBottom: SharedValue<number>;
  onDragStart: (index: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onScrollEnable: (enabled: boolean) => void;
}) {
  const isActive = useSharedValue(false);

  const calculateTargetIndex = (
    totalDisplacement: number,
    fromIndex: number,
    heights: number[],
    count: number,
  ): number => {
    'worklet';
    let targetIndex = fromIndex;
    if (totalDisplacement > 0) {
      let accumulated = 0;
      for (let i = fromIndex + 1; i < count; i++) {
        accumulated += (heights[i] || 0) + spacing.sm;
        if (totalDisplacement > accumulated - (heights[i] || 0) / 2) {
          targetIndex = i;
        } else {
          break;
        }
      }
    } else if (totalDisplacement < 0) {
      let accumulated = 0;
      for (let i = fromIndex - 1; i >= 0; i--) {
        accumulated -= (heights[i] || 0) + spacing.sm;
        if (totalDisplacement < accumulated + (heights[i] || 0) / 2) {
          targetIndex = i;
        } else {
          break;
        }
      }
    }
    return targetIndex;
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      isActive.value = true;
      activeOriginalIndex.value = index;
      activeIndex.value = index;
      fingerTranslation.value = 0;
      scrollCompensation.value = 0;
      autoScrollSpeed.value = 0;

      // Measure container for edge detection
      const m = measure(scrollRef);
      if (m) {
        containerTop.value = m.pageY;
        containerBottom.value = m.pageY + m.height;
      }

      runOnJS(onDragStart)(index);
      runOnJS(onScrollEnable)(false);
    })
    .onChange((event) => {
      fingerTranslation.value = event.translationY;
      const totalDisplacement = event.translationY + scrollCompensation.value;

      // Calculate target index
      activeIndex.value = calculateTargetIndex(
        totalDisplacement,
        index,
        itemHeights.current,
        itemCount,
      );

      // Auto-scroll near edges
      const fingerY = event.absoluteY;
      const top = containerTop.value;
      const bottom = containerBottom.value;
      if (fingerY < top + EDGE_THRESHOLD && fingerY >= top) {
        const factor = 1 - (fingerY - top) / EDGE_THRESHOLD;
        autoScrollSpeed.value = -MAX_AUTO_SCROLL_SPEED * Math.max(0, factor);
      } else if (fingerY > bottom - EDGE_THRESHOLD && fingerY <= bottom) {
        const factor = 1 - (bottom - fingerY) / EDGE_THRESHOLD;
        autoScrollSpeed.value = MAX_AUTO_SCROLL_SPEED * Math.max(0, factor);
      } else {
        autoScrollSpeed.value = 0;
      }
    })
    .onEnd(() => {
      const toIndex = activeIndex.value;
      isActive.value = false;
      autoScrollSpeed.value = 0;
      fingerTranslation.value = withTiming(0, TIMING_CONFIG);
      scrollCompensation.value = 0;
      activeOriginalIndex.value = -1;
      activeIndex.value = -1;
      runOnJS(onDragEnd)(index, toIndex);
      runOnJS(onScrollEnable)(true);
    })
    .onFinalize(() => {
      if (!isActive.value) return;
      isActive.value = false;
      autoScrollSpeed.value = 0;
      fingerTranslation.value = withTiming(0, TIMING_CONFIG);
      scrollCompensation.value = 0;
      activeOriginalIndex.value = -1;
      activeIndex.value = -1;
      runOnJS(onScrollEnable)(true);
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (isActive.value) {
      return {
        transform: [
          { translateY: fingerTranslation.value + scrollCompensation.value },
          { scale: 1.03 },
        ],
        zIndex: 999,
        opacity: 0.9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      };
    }

    const from = activeOriginalIndex.value;
    const to = activeIndex.value;
    if (from === -1 || to === -1) {
      return {
        transform: [{ translateY: withTiming(0, TIMING_CONFIG) }],
        zIndex: 0,
        opacity: 1,
      };
    }

    // Shift non-active items to make room for the dragged item
    const heights = itemHeights.current;
    let shift = 0;
    if (from < to) {
      // Dragging down: items between from+1..to shift up
      if (index > from && index <= to) {
        shift = -((heights[from] || 0) + spacing.sm);
      }
    } else if (from > to) {
      // Dragging up: items between to..from-1 shift down
      if (index >= to && index < from) {
        shift = (heights[from] || 0) + spacing.sm;
      }
    }

    return {
      transform: [{ translateY: withTiming(shift, TIMING_CONFIG) }],
      zIndex: 0,
      opacity: 1,
    };
  });

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      itemHeights.current[index] = event.nativeEvent.layout.height;
    },
    [index, itemHeights],
  );

  return (
    <Animated.View style={animatedStyle} onLayout={handleLayout}>
      <View style={styles.sortableItem}>
        <View style={styles.itemContent}>{renderItem(item, index)}</View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={styles.gripHandle}
            accessibilityRole="button"
            accessibilityLabel="Reorder"
          >
            <Ionicons
              name="reorder-three"
              size={24}
              color={lightTheme.textTertiary}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

export function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  style,
  contentContainerStyle,
}: SortableListProps<T>) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useSharedValue(0);
  const containerTop = useSharedValue(0);
  const containerBottom = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const autoScrollSpeed = useSharedValue(0);
  const activeOriginalIndex = useSharedValue(-1);
  const activeIndex = useSharedValue(-1);
  const fingerTranslation = useSharedValue(0);
  const scrollCompensation = useSharedValue(0);
  const itemHeights = useRef<number[]>([]);
  const dragFromIndex = useRef(-1);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  // Auto-scroll frame callback: runs every frame on UI thread
  useFrameCallback(() => {
    if (autoScrollSpeed.value === 0) return;

    const maxScroll = contentHeight.value - containerHeight.value;
    if (maxScroll <= 0) return;

    const currentOffset = scrollOffset.value;
    const newOffset = Math.max(
      0,
      Math.min(currentOffset + autoScrollSpeed.value, maxScroll),
    );
    const actualDelta = newOffset - currentOffset;
    if (actualDelta === 0) return;

    scrollOffset.value = newOffset;
    scrollTo(scrollRef, 0, newOffset, false);
    scrollCompensation.value += actualDelta;

    // Recalculate target index during auto-scroll
    const fromIndex = activeOriginalIndex.value;
    if (fromIndex === -1) return;

    const totalDisplacement =
      fingerTranslation.value + scrollCompensation.value;
    const heights = itemHeights.current;
    const count = data.length;
    let targetIndex = fromIndex;

    if (totalDisplacement > 0) {
      let accumulated = 0;
      for (let i = fromIndex + 1; i < count; i++) {
        accumulated += (heights[i] || 0) + spacing.sm;
        if (totalDisplacement > accumulated - (heights[i] || 0) / 2) {
          targetIndex = i;
        } else {
          break;
        }
      }
    } else if (totalDisplacement < 0) {
      let accumulated = 0;
      for (let i = fromIndex - 1; i >= 0; i--) {
        accumulated -= (heights[i] || 0) + spacing.sm;
        if (totalDisplacement < accumulated + (heights[i] || 0) / 2) {
          targetIndex = i;
        } else {
          break;
        }
      }
    }
    activeIndex.value = targetIndex;
  });

  const handleContainerLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      containerHeight.value = event.nativeEvent.layout.height;
    },
    [containerHeight],
  );

  const handleContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentHeight.value = h;
    },
    [contentHeight],
  );

  const handleDragStart = useCallback((index: number) => {
    dragFromIndex.current = index;
  }, []);

  const handleDragEnd = useCallback(
    (from: number, to: number) => {
      if (
        from !== to &&
        from >= 0 &&
        to >= 0 &&
        from < data.length &&
        to < data.length
      ) {
        onReorder(reorder(data, from, to));
      }
      dragFromIndex.current = -1;
    },
    [data, onReorder],
  );

  const handleScrollEnable = useCallback((enabled: boolean) => {
    setScrollEnabled(enabled);
  }, []);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
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
            itemCount={data.length}
            renderItem={renderItem}
            itemHeights={itemHeights}
            activeOriginalIndex={activeOriginalIndex}
            activeIndex={activeIndex}
            fingerTranslation={fingerTranslation}
            scrollCompensation={scrollCompensation}
            autoScrollSpeed={autoScrollSpeed}
            scrollRef={scrollRef}
            containerTop={containerTop}
            containerBottom={containerBottom}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onScrollEnable={handleScrollEnable}
          />
        ))}
      </View>
    </Animated.ScrollView>
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
