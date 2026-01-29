import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/lib/colors';
import { typography } from '@/lib/typography';

interface StreakBadgeProps {
  /** ストリーク日数 */
  streak: number;
  /** サイズ */
  size?: 'sm' | 'md';
}

/**
 * ストリークバッジコンポーネント
 * 連続達成日数を炎アイコンと共に表示
 */
export function StreakBadge({ streak, size = 'sm' }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <View style={[styles.container, size === 'md' && styles.containerMd]}>
      <Text style={[styles.icon, size === 'md' && styles.iconMd]}>🔥</Text>
      <Text style={[styles.text, size === 'md' && styles.textMd]}>
        {streak}日
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  containerMd: {
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  iconMd: {
    fontSize: 16,
  },
  text: {
    ...typography.caption,
    color: colors.streak,
  },
  textMd: {
    ...typography.bodySmallMedium,
  },
});
