import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';

interface ConfirmDialogProps {
  /** ダイアログの表示状態 */
  visible: boolean;
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** 確認ボタンのテキスト */
  confirmText?: string;
  /** キャンセルボタンのテキスト */
  cancelText?: string;
  /** 確認ボタンを危険な操作として表示 */
  destructive?: boolean;
  /** 確認時のコールバック */
  onConfirm: () => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
}

/**
 * 確認ダイアログ
 * - 画面中央に表示
 * - 背景タップで閉じる
 * - 全画面共通で使用
 * Note: confirmText and cancelText should be passed as already-translated strings
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Default values are set to English. Callers should pass translated strings.
  const finalConfirmText = confirmText ?? 'Confirm';
  const finalCancelText = cancelText ?? 'Cancel';
  // 背景タップでキャンセル
  const handleBackdropPress = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // ダイアログ内のタップはイベント伝播を止める
  const handleDialogPress = useCallback(() => {
    // 何もしない（イベント伝播を止めるため）
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={handleDialogPress}>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttons}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>{finalCancelText}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.button,
                    styles.confirmButton,
                    destructive && styles.destructiveButton,
                  ]}
                  onPress={onConfirm}
                >
                  <Text
                    style={[
                      styles.confirmButtonText,
                      destructive && styles.destructiveButtonText,
                    ]}
                  >
                    {finalConfirmText}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    ...typography.h4,
    color: lightTheme.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: lightTheme.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: lightTheme.surfaceSecondary,
  },
  cancelButtonText: {
    ...typography.button,
    color: lightTheme.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary[500],
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.white,
  },
  destructiveButton: {
    backgroundColor: colors.error[500],
  },
  destructiveButtonText: {
    color: colors.white,
  },
});
