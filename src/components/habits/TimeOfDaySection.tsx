import { View, Text, StyleSheet } from 'react-native';
import { lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing } from '@/lib/spacing';
import type { TimeOfDay } from '@/types/database';

interface TimeOfDaySectionProps {
  /** 時間帯 */
  timeOfDay: TimeOfDay;
  /** 子要素 */
  children: React.ReactNode;
}

/**
 * 時間帯ラベルとアイコンのマッピング
 */
const TIME_OF_DAY_CONFIG: Record<TimeOfDay, { icon: string; label: string }> = {
  morning: { icon: '🌅', label: '朝' },
  afternoon: { icon: '🌤️', label: '日中' },
  evening: { icon: '🌆', label: '夕方' },
  night: { icon: '🌙', label: '夜' },
  anytime: { icon: '⏰', label: 'いつでも' },
};

/**
 * 時間帯セクションコンポーネント
 * 習慣を時間帯ごとにグループ化して表示
 */
export function TimeOfDaySection({
  timeOfDay,
  children,
}: TimeOfDaySectionProps) {
  const config = TIME_OF_DAY_CONFIG[timeOfDay];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.label}>{config.label}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    ...typography.bodySmallMedium,
    color: lightTheme.textSecondary,
  },
  content: {
    gap: spacing.sm,
  },
});
