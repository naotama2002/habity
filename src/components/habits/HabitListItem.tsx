import { View, Text, StyleSheet, Pressable } from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius, shadows } from '@/lib/spacing';
import { parseRRule } from '@/lib/recurrence';
import { StreakBadge } from './StreakBadge';
import type { Habit } from '@/types/database';

interface HabitListItemProps {
  /** 習慣データ */
  habit: Habit;
  /** ストリーク日数 */
  streak?: number;
  /** タップ時のコールバック */
  onPress?: (habit: Habit) => void;
  /** 編集モード */
  editMode?: boolean;
}

/**
 * 習慣リストアイテムコンポーネント
 * Habits 画面で使用
 */
export function HabitListItem({
  habit,
  streak = 0,
  onPress,
  editMode = false,
}: HabitListItemProps) {
  const { _ } = useLingui();

  const handlePress = () => {
    if (editMode) return;
    onPress?.(habit);
  };

  const weekdayLabels = [
    _(msg`Mon`), _(msg`Tue`), _(msg`Wed`), _(msg`Thu`),
    _(msg`Fri`), _(msg`Sat`), _(msg`Sun`),
  ];

  // 頻度の表示テキストを生成
  const getFrequencyText = () => {
    if (!habit.recurrence_rule) {
      return _(msg`Daily`);
    }
    const parsed = parseRRule(habit.recurrence_rule);
    switch (parsed.type) {
      case 'weekly': {
        const days = parsed.weekdays.map(d => weekdayLabels[d]).join(',');
        return `${_(msg`Weekly`)} ${days}`;
      }
      case 'monthly': {
        const days = parsed.monthdays.join(',');
        return `${_(msg`Monthly`)} ${days}`;
      }
      case 'interval': {
        if (parsed.interval === 1) return _(msg`Daily`);
        return `${parsed.interval}${_(msg`days`)}`;
      }
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && !editMode && styles.containerPressed]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.meta}>
            {getFrequencyText()}
          </Text>
        </View>

        {!editMode && (
          <View style={styles.right}>
            {streak > 0 && <StreakBadge streak={streak} />}
          </View>
        )}
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
