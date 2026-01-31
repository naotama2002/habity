import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Input,
  SegmentedControl,
  MultiSelect,
  FormField,
  ConfirmDialog,
  timeOfDayOptions,
} from '@/components/ui';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import {
  validateHabitFormFields,
  getDefaultHabitFormData,
  type HabitFormData,
} from '@/lib/validation/habit';
import type { TrackingType, GoalPeriod, TimeOfDay } from '@/types/database';

interface HabitFormProps {
  /** 初期値（編集時） */
  initialValues?: Partial<HabitFormData>;
  /** 送信時のコールバック */
  onSubmit: (data: HabitFormData) => Promise<void>;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** 送信中フラグ */
  isSubmitting?: boolean;
}

/**
 * トラッキングタイプの選択肢
 */
const TRACKING_TYPE_SEGMENTS: { value: TrackingType; label: string }[] = [
  { value: 'boolean', label: 'やったか' },
  { value: 'numeric', label: '数値' },
  { value: 'duration', label: '時間' },
];

/**
 * 目標期間の選択肢
 */
const GOAL_PERIOD_SEGMENTS: { value: GoalPeriod; label: string }[] = [
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
];

/**
 * 習慣作成/編集フォーム
 */
export function HabitForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: HabitFormProps) {
  // フォームの状態
  const [formData, setFormData] = useState<HabitFormData>(() => ({
    ...getDefaultHabitFormData(),
    ...initialValues,
  }));

  // dirty state（変更があったかどうか）
  const [isDirty, setIsDirty] = useState(false);

  // タッチされたフィールド（バリデーション表示用）
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // 確認ダイアログの表示状態
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // バリデーションエラー
  const errors = useMemo(() => validateHabitFormFields(formData), [formData]);

  // フォームが有効かどうか
  const isValid = useMemo(
    () => Object.values(errors).every((error) => error === null),
    [errors]
  );

  // フィールド更新
  const updateField = useCallback(<K extends keyof HabitFormData>(
    field: K,
    value: HabitFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // フィールドタッチ
  const touchField = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  // タッチされたフィールドのエラーのみ表示
  const getFieldError = useCallback(
    (field: string) => (touched.has(field) ? errors[field] : null),
    [touched, errors]
  );

  // トラッキングタイプ変更時に目標値と単位をリセット
  useEffect(() => {
    if (formData.tracking_type === 'boolean') {
      setFormData((prev) => ({
        ...prev,
        goal_value: 1,
        goal_unit: '回',
      }));
    } else if (formData.tracking_type === 'duration') {
      setFormData((prev) => ({
        ...prev,
        goal_unit: '分',
      }));
    }
  }, [formData.tracking_type]);

  // 送信処理
  const handleSubmit = async () => {
    // 全フィールドをタッチ済みにする
    setTouched(new Set(Object.keys(errors)));

    if (!isValid) {
      // バリデーションエラーがある場合はフィードバック
      if (Platform.OS === 'web') {
        window.alert('入力内容に誤りがあります。赤色で表示されているエラーを確認してください。');
      } else {
        Alert.alert('入力エラー', '入力内容に誤りがあります。確認してください。');
      }
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error: unknown) {
      let message = '保存に失敗しました。もう一度お試しください。';
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as { message: unknown }).message);
      }
      if (Platform.OS === 'web') {
        window.alert(`エラー: ${message}`);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (isDirty) {
      // 変更がある場合は確認ダイアログを表示
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  // キャンセル確認ダイアログの確定
  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  // キャンセル確認ダイアログのキャンセル
  const handleDismissCancelConfirm = () => {
    setShowCancelConfirm(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 習慣名 */}
        <FormField
          label="習慣名"
          required
          error={getFieldError('name')}
        >
          <Input
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            onBlur={() => touchField('name')}
            placeholder="例: 読書、運動、瞑想"
            maxLength={100}
            autoFocus
          />
        </FormField>

        {/* 説明 */}
        <FormField
          label="説明"
          error={getFieldError('description')}
          hint="習慣の目的やルールをメモ"
        >
          <Input
            value={formData.description ?? ''}
            onChangeText={(value) => updateField('description', value || null)}
            onBlur={() => touchField('description')}
            placeholder="任意"
            multiline
            numberOfLines={3}
            maxLength={500}
            style={styles.textArea}
          />
        </FormField>

        {/* トラッキング方法 */}
        <FormField
          label="トラッキング方法"
          required
          error={getFieldError('tracking_type')}
        >
          <SegmentedControl
            segments={TRACKING_TYPE_SEGMENTS}
            value={formData.tracking_type}
            onChange={(value) => updateField('tracking_type', value)}
          />
        </FormField>

        {/* 目標値（数値/時間タイプの場合） */}
        {formData.tracking_type !== 'boolean' && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label="目標値"
                required
                error={getFieldError('goal_value')}
              >
                <Input
                  value={formData.goal_value.toString()}
                  onChangeText={(value) => {
                    const num = parseFloat(value) || 0;
                    updateField('goal_value', num);
                  }}
                  onBlur={() => touchField('goal_value')}
                  placeholder="例: 30"
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>

            {formData.tracking_type === 'numeric' && (
              <View style={styles.flex1}>
                <FormField
                  label="単位"
                  required
                  error={getFieldError('goal_unit')}
                >
                  <Input
                    value={formData.goal_unit}
                    onChangeText={(value) => updateField('goal_unit', value)}
                    onBlur={() => touchField('goal_unit')}
                    placeholder="例: 回, km, ページ"
                    maxLength={20}
                  />
                </FormField>
              </View>
            )}

            {formData.tracking_type === 'duration' && (
              <View style={styles.unitLabel}>
                <Text style={styles.unitText}>分</Text>
              </View>
            )}
          </View>
        )}

        {/* 目標期間 */}
        <FormField
          label="目標期間"
          required
          error={getFieldError('goal_period')}
        >
          <SegmentedControl
            segments={GOAL_PERIOD_SEGMENTS}
            value={formData.goal_period}
            onChange={(value) => updateField('goal_period', value)}
          />
        </FormField>

        {/* 時間帯 */}
        <FormField
          label="実行する時間帯"
          required
          error={getFieldError('time_of_day')}
          hint="複数選択可"
        >
          <MultiSelect
            options={timeOfDayOptions}
            value={formData.time_of_day}
            onChange={(value) => updateField('time_of_day', value as TimeOfDay[])}
          />
        </FormField>

        {/* 開始日 */}
        <FormField
          label="開始日"
          required
          error={getFieldError('start_date')}
        >
          <Pressable
            style={styles.dateInput}
            onPress={() => {
              // TODO: DatePicker を実装
              touchField('start_date');
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={lightTheme.textSecondary}
            />
            <Text style={styles.dateText}>
              {formatDate(formData.start_date)}
            </Text>
          </Pressable>
        </FormField>
      </ScrollView>

      {/* フッターボタン */}
      <View style={styles.footer}>
        <Pressable
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </Pressable>
        <Pressable
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '保存中...' : '保存'}
          </Text>
        </Pressable>
      </View>

      {/* キャンセル確認ダイアログ */}
      <ConfirmDialog
        visible={showCancelConfirm}
        title="変更を破棄"
        message="入力した内容は保存されません。よろしいですか？"
        confirmText="破棄"
        cancelText="編集を続ける"
        destructive
        onConfirm={handleConfirmCancel}
        onCancel={handleDismissCancelConfirm}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * 日付をフォーマット
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  unitLabel: {
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg + spacing.md,
  },
  unitText: {
    ...typography.body,
    color: lightTheme.textSecondary,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dateText: {
    ...typography.body,
    color: lightTheme.text,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: lightTheme.border,
    backgroundColor: lightTheme.background,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  cancelButtonText: {
    ...typography.button,
    color: lightTheme.textSecondary,
  },
  submitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[500],
  },
  submitButtonDisabled: {
    backgroundColor: colors.primary[200],
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
