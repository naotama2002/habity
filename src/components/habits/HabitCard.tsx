import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius, shadows } from '@/lib/spacing';
import { StreakBadge } from './StreakBadge';
import type { HabitWithTodayLog } from '@/types/database';

interface HabitCardProps {
  /** 習慣データ */
  habit: HabitWithTodayLog;
  /** ストリーク日数 */
  streak?: number;
  /** チェックイン時のコールバック */
  onToggle?: (habit: HabitWithTodayLog) => void;
  /** 詳細表示時のコールバック */
  onPress?: (habit: HabitWithTodayLog) => void;
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
  const isCompleted = habit.is_completed_today;

  const handleToggle = async () => {
    // Haptics フィードバック（ネイティブプラットフォームのみ）
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle?.(habit);
  };

  const handlePress = () => {
    onPress?.(habit);
  };

  // 目標表示テキストを生成
  const getGoalText = () => {
    if (habit.tracking_type === 'boolean') {
      return null;
    }
    const current = habit.log_value ?? 0;
    return `${current}/${habit.goal_value} ${habit.goal_unit}`;
  };

  const goalText = getGoalText();

  return (
    <Pressable
      style={[styles.container, isCompleted && styles.containerCompleted]}
      onPress={handlePress}
      onLongPress={handlePress}
    >
      {/* チェックボックス */}
      <Pressable
        style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
        onPress={handleToggle}
        hitSlop={8}
      >
        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      {/* コンテンツ */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.name, isCompleted && styles.nameCompleted]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>
          {goalText && (
            <Text style={styles.goal}>
              {goalText}
              {isCompleted && ' ✓'}
            </Text>
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
  checkmark: {
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
  goal: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
});
