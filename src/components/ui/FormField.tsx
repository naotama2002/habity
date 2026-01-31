import { View, Text, StyleSheet } from 'react-native';
import { lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing } from '@/lib/spacing';

interface FormFieldProps {
  /** フィールドラベル */
  label: string;
  /** 必須マーク表示 */
  required?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** ヘルプテキスト */
  hint?: string;
  /** フィールドの内容 */
  children: React.ReactNode;
}

/**
 * フォームフィールドラッパー
 * ラベル、エラー、ヒントを含むフォーム入力のコンテナ
 */
export function FormField({
  label,
  required = false,
  error,
  hint,
  children,
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmallMedium,
    color: lightTheme.text,
  },
  required: {
    ...typography.bodySmall,
    color: lightTheme.error,
    marginLeft: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: lightTheme.error,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: lightTheme.textTertiary,
    marginTop: spacing.xs,
  },
});
