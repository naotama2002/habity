import {View, Text, StyleSheet, Pressable, Platform} from 'react-native';
import {msg} from '@lingui/macro';
import {useLingui} from '@lingui/react';
import * as Haptics from 'expo-haptics';
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
  const isCompleted = habit.is_completed;
  const isSkipped = habit.is_skipped;

  const handleToggle = async () => {
    if (isSkipped) return; // スキップ中はトグル不可
    // Haptics フィードバック（ネイティブプラットフォームのみ）
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle?.(habit);
  };

  const handlePress = () => {
    onPress?.(habit);
  };

  // コンテナスタイルの決定
  const containerStyle = [
    styles.container,
    isCompleted && styles.containerCompleted,
    isSkipped && styles.containerSkipped,
  ];

  // チェックボックススタイルの決定
  const checkboxStyle = [
    styles.checkbox,
    isCompleted && styles.checkboxCompleted,
    isSkipped && styles.checkboxSkipped,
  ];

  // 名前スタイルの決定
  const nameStyle = [
    styles.name,
    isCompleted && styles.nameCompleted,
    isSkipped && styles.nameSkipped,
  ];

  return (
      <Pressable
        testID="habit-card"
        style={containerStyle}
        onPress={handlePress}
      >
        {/* チェックボックス */}
        <Pressable
          testID="habit-checkbox"
          style={checkboxStyle}
          onPress={handleToggle}
          hitSlop={8}
        >
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
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
