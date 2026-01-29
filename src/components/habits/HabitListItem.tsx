import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius, shadows } from '@/lib/spacing';
import { StreakBadge } from './StreakBadge';
import type { Habit } from '@/types/database';

interface HabitListItemProps {
  /** 習慣データ */
  habit: Habit;
  /** ストリーク日数 */
  streak?: number;
  /** タップ時のコールバック */
  onPress?: (habit: Habit) => void;
}

/**
 * トラッキングタイプのラベル
 */
const TRACKING_TYPE_LABELS: Record<Habit['tracking_type'], string> = {
  boolean: 'チェック',
  numeric: '数値',
  duration: '時間',
};

/**
 * 習慣リストアイテムコンポーネント
 * Habits 画面で使用
 */
export function HabitListItem({ habit, streak = 0, onPress }: HabitListItemProps) {
  const handlePress = () => {
    onPress?.(habit);
  };

  // 頻度の表示テキストを生成
  const getFrequencyText = () => {
    // TODO: recurrence_rule をパースして表示
    return '毎日';
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.meta}>
            {getFrequencyText()}
            {habit.tracking_type !== 'boolean' && (
              <Text> • {habit.goal_value} {habit.goal_unit}</Text>
            )}
          </Text>
        </View>

        <View style={styles.right}>
          {streak > 0 && <StreakBadge streak={streak} />}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={lightTheme.textTertiary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  containerPressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    ...typography.bodyMedium,
    color: lightTheme.text,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
