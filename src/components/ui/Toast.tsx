import {View, Text, StyleSheet, Pressable} from 'react-native';
import {colors} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';

interface ToastProps {
  /** 表示するメッセージ。null のときは何も描画しない */
  message: string | null;
  /** 閉じるボタン / 本体タップ時のコールバック */
  onDismiss: () => void;
  /** 閉じるボタンのラベル（翻訳済み文字列を渡すこと） */
  dismissLabel: string;
}

/**
 * エラー通知トースト
 *
 * 画面下部に重ねて表示する。表示のみを担い、出し分けや自動消去は
 * ToastProvider (src/state/toast) が持つ。
 */
export function Toast({message, onDismiss, dismissLabel}: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        testID="toast"
        style={styles.container}
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={message}
      >
        <Text style={styles.message} testID="toast-message">
          {message}
        </Text>
        <Text style={styles.dismiss} testID="toast-dismiss">
          {dismissLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 520,
    width: '100%',
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  message: {
    flex: 1,
    ...typography.body,
    color: colors.error[700],
  },
  dismiss: {
    ...typography.caption,
    color: colors.error[700],
    fontWeight: '600',
  },
});
