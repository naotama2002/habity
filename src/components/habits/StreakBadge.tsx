import {View, Text, StyleSheet} from 'react-native';
import { msg } from '@lingui/core/macro';
import {useLingui} from '@lingui/react';
import {colors} from '@/lib/colors';
import {typography} from '@/lib/typography';

interface StreakBadgeProps {
  /** ストリーク日数 */
  streak: number;
  /** サイズ */
  size?: 'sm' | 'md';
  /** 未完了状態（グレー表示） */
  inactive?: boolean;
  /** テストID */
  testID?: string;
}

/**
 * ストリークバッジコンポーネント
 * 連続達成日数を炎アイコンと共に表示
 * inactive=true の場合はグレー表示（未チェック状態）
 */
export function StreakBadge({
  streak,
  size = 'sm',
  inactive = false,
  testID,
}: StreakBadgeProps) {
  const {_} = useLingui();

  if (streak <= 0) return null;

  return (
    <View testID={testID} style={[styles.container, size === 'md' && styles.containerMd]}>
      <Text
        testID={testID ? `${testID}-icon` : undefined}
        style={[styles.icon, size === 'md' && styles.iconMd, inactive && styles.iconInactive]}
      >
        🔥
      </Text>
      <Text
        testID={testID ? `${testID}-text` : undefined}
        style={[styles.text, size === 'md' && styles.textMd, inactive && styles.textInactive]}
      >
        {_(msg`${streak} days`)}
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
  iconInactive: {
    opacity: 0.4,
  },
  textInactive: {
    color: colors.gray[400],
  },
});
