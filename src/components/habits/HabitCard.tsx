import {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {msg} from '@lingui/macro';
import {useLingui} from '@lingui/react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';
import {StreakBadge} from './StreakBadge';
import type {HabitWithLog} from '@/types/database';

interface HabitCardProps {
  /** 習慣データ */
  habit: HabitWithLog;
  /** ストリーク日数 */
  streak?: number;
  /** チェックイン時のコールバック */
  onToggle?: (habit: HabitWithLog) => void;
  /** 詳細表示時のコールバック */
  onPress?: (habit: HabitWithLog) => void;
}

/**
 * 習慣カードコンポーネント
 * Today 画面で使用する習慣表示カード
 */
export function HabitCard({
  habit,
  streak = 0,
  onToggle,
  onPress,
}: HabitCardProps) {
  const {_} = useLingui();
  const isSkipped = habit.is_skipped;

  // ローカル楽観的更新: チェックマークを即座に表示
  const [optimisticCompleted, setOptimisticCompleted] = useState(habit.is_completed);

  // サーバーからの確定データで同期
  useEffect(() => {
    setOptimisticCompleted(habit.is_completed);
  }, [habit.is_completed]);

  // 緑フラッシュアニメーション用 shared value (0 = 透明, 1 = 不透明)
  const flashOpacity = useSharedValue(0);

  const handleToggle = () => {
    if (isSkipped) return; // スキップ中はトグル不可

    const willComplete = !optimisticCompleted;

    // 1. チェックマークを即座に表示/非表示
    setOptimisticCompleted(willComplete);

    // 2. 完了時のみ: 緑フラッシュをチェックの後に再生
    if (willComplete) {
      flashOpacity.value = withDelay(
        100,
        withSequence(
          withTiming(1, {duration: 200}),
          withTiming(0, {duration: 300}),
        ),
      );
    }

    // 3. サーバーに送信
    onToggle?.(habit);
  };

  const handlePress = () => {
    onPress?.(habit);
  };

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // コンテナスタイルの決定
  const containerStyle = [
    styles.container,
    optimisticCompleted && styles.containerCompleted,
    isSkipped && styles.containerSkipped,
  ];

  // チェックボックススタイルの決定
  const checkboxStyle = [
    styles.checkbox,
    optimisticCompleted && styles.checkboxCompleted,
    isSkipped && styles.checkboxSkipped,
  ];

  // 名前スタイルの決定
  const nameStyle = [
    styles.name,
    optimisticCompleted && styles.nameCompleted,
    isSkipped && styles.nameSkipped,
  ];

  return (
      <Pressable
        testID="habit-card"
        style={containerStyle}
        onPress={handlePress}
      >
        {/* 緑フラッシュオーバーレイ */}
        <Animated.View
          style={[styles.flashOverlay, flashStyle]}
          pointerEvents="none"
        />

        {/* チェックボックス */}
        <Pressable
          testID="habit-checkbox"
          style={checkboxStyle}
          onPress={handleToggle}
          hitSlop={8}
        >
          {optimisticCompleted && <Text style={styles.checkmark}>✓</Text>}
          {isSkipped && <Text style={styles.skipMark}>⊘</Text>}
        </Pressable>

        {/* コンテンツ */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={nameStyle} numberOfLines={1}>
              {habit.name}
            </Text>
            {isSkipped && (
              <Text style={styles.skipLabel}>{_(msg`Skipped`)}</Text>
            )}
          </View>

          {/* ストリーク */}
          <StreakBadge streak={streak} />
        </View>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: lightTheme.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  containerCompleted: {
    backgroundColor: lightTheme.surfaceSecondary,
    borderColor: lightTheme.borderLight,
  },
  containerSkipped: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.7,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.success[100],
    borderRadius: borderRadius.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  checkboxSkipped: {
    backgroundColor: colors.gray[300],
    borderColor: colors.gray[300],
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  skipMark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyMedium,
    color: lightTheme.text,
    flex: 1,
  },
  nameCompleted: {
    color: lightTheme.textSecondary,
    textDecorationLine: 'line-through',
  },
  nameSkipped: {
    color: lightTheme.textTertiary,
    textDecorationLine: 'line-through',
  },
  skipLabel: {
    ...typography.bodySmall,
    color: colors.gray[400],
  },
});
