import {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {colors} from '@/lib/colors';
import {spacing} from '@/lib/spacing';

const THRESHOLD = 80;
const MAX_SWIPE = 150;

interface HabitCardActionsProps {
  isSkipped: boolean;
  onSkip: () => void;
  onUnskip: () => void;
  children: React.ReactNode;
}

/**
 * HabitCard のアクションメニュー (Native版)
 * 右スワイプ（左→右）でアクションアイコンが出現
 * 閾値(80px)超えでHaptic + アクション実行
 *
 * Bluesky の GestureActionView パターンを簡易化
 */
export function HabitCardActions({
  isSkipped,
  onSkip,
  onUnskip,
  children,
}: HabitCardActionsProps) {
  const transX = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const hitThreshold = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const executeAction = useCallback(() => {
    if (isSkipped) {
      onUnskip();
    } else {
      onSkip();
    }
  }, [isSkipped, onSkip, onUnskip]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([10, 200])
    .activeOffsetY([-200, 200])
    .onChange(e => {
      'worklet';
      // 右スワイプのみ (左→右)
      const clamped = Math.max(0, Math.min(e.translationX, MAX_SWIPE));
      transX.set(clamped);

      if (clamped >= THRESHOLD && !hitThreshold.get()) {
        hitThreshold.set(true);
        // ポップアニメーション
        iconScale.set(
          withSequence(
            withTiming(1.3, {duration: 150}),
            withTiming(1, {duration: 100}),
          ),
        );
        runOnJS(triggerHaptic)();
      } else if (clamped < THRESHOLD && hitThreshold.get()) {
        hitThreshold.set(false);
      }
    })
    .onEnd(() => {
      'worklet';
      if (hitThreshold.get()) {
        runOnJS(executeAction)();
      }
      transX.set(withTiming(0, {duration: 200}));
      hitThreshold.set(false);
    });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{translateX: transX.get()}],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transX.get(), [0, THRESHOLD], [0, 1]),
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transX.get(), [0, 40], [0, 1]),
    transform: [{scale: iconScale.get()}],
  }));

  const backgroundColor = isSkipped ? colors.primary[500] : colors.gray[400];
  const iconText = isSkipped ? '↩' : '⊘';

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {/* 背景 + アイコン */}
        <Animated.View
          style={[styles.background, {backgroundColor}, animatedBackgroundStyle]}
        >
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <Text style={styles.icon}>{iconText}</Text>
          </Animated.View>
        </Animated.View>

        {/* スライドするコンテンツ */}
        <Animated.View style={animatedContentStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
    borderRadius: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    color: colors.white,
  },
});
