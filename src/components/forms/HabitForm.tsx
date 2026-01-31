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
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Ionicons } from '@expo/vector-icons';
import {
  Input,
  SegmentedControl,
  MultiSelect,
  FormField,
  ConfirmDialog,
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
 * 習慣作成/編集フォーム
 */
export function HabitForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: HabitFormProps) {
  const { _ } = useLingui();

  // トラッキングタイプの選択肢
  const trackingTypeSegments: { value: TrackingType; label: string }[] = [
    { value: 'boolean', label: _(msg`Did it`) },
    { value: 'numeric', label: _(msg`Numeric`) },
    { value: 'duration', label: _(msg`Duration`) },
  ];

  // 目標期間の選択肢
  const goalPeriodSegments: { value: GoalPeriod; label: string }[] = [
    { value: 'daily', label: _(msg`Daily`) },
    { value: 'weekly', label: _(msg`Weekly`) },
    { value: 'monthly', label: _(msg`Monthly`) },
  ];

  // 時間帯の選択肢
  const timeOfDayOptions = [
    { value: 'morning', label: _(msg`Morning`) },
    { value: 'afternoon', label: _(msg`Afternoon`) },
    { value: 'evening', label: _(msg`Evening`) },
    { value: 'night', label: _(msg`Night`) },
    { value: 'anytime', label: _(msg`Anytime`) },
  ];
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
      const errorTitle = _(msg`Input Error`);
      const errorMessage = _(msg`There are errors in the input. Please check the fields highlighted in red.`);
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(errorTitle, errorMessage);
      }
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error: unknown) {
      let message = _(msg`Failed to save. Please try again.`);
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as { message: unknown }).message);
      }
      const errorLabel = _(msg`Error`);
      if (Platform.OS === 'web') {
        window.alert(`${errorLabel}: ${message}`);
      } else {
        Alert.alert(errorLabel, message);
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
          label={_(msg`Habit Name`)}
          required
          error={getFieldError('name')}
        >
          <Input
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            onBlur={() => touchField('name')}
            placeholder={_(msg`e.g., Reading, Exercise, Meditation`)}
            maxLength={100}
            autoFocus
          />
        </FormField>

        {/* 説明 */}
        <FormField
          label={_(msg`Description`)}
          error={getFieldError('description')}
          hint={_(msg`Note the purpose or rules of the habit`)}
        >
          <Input
            value={formData.description ?? ''}
            onChangeText={(value) => updateField('description', value || null)}
            onBlur={() => touchField('description')}
            placeholder={_(msg`Optional`)}
            multiline
            numberOfLines={3}
            maxLength={500}
            style={styles.textArea}
          />
        </FormField>

        {/* トラッキング方法 */}
        <FormField
          label={_(msg`Tracking Method`)}
          required
          error={getFieldError('tracking_type')}
        >
          <SegmentedControl
            segments={trackingTypeSegments}
            value={formData.tracking_type}
            onChange={(value) => updateField('tracking_type', value)}
          />
        </FormField>

        {/* 目標値（数値/時間タイプの場合） */}
        {formData.tracking_type !== 'boolean' && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label={_(msg`Goal Value`)}
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
                  placeholder={_(msg`e.g., 30`)}
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>

            {formData.tracking_type === 'numeric' && (
              <View style={styles.flex1}>
                <FormField
                  label={_(msg`Unit`)}
                  required
                  error={getFieldError('goal_unit')}
                >
                  <Input
                    value={formData.goal_unit}
                    onChangeText={(value) => updateField('goal_unit', value)}
                    onBlur={() => touchField('goal_unit')}
                    placeholder={_(msg`e.g., times, km, pages`)}
                    maxLength={20}
                  />
                </FormField>
              </View>
            )}

            {formData.tracking_type === 'duration' && (
              <View style={styles.unitLabel}>
                <Text style={styles.unitText}>{_(msg`min`)}</Text>
              </View>
            )}
          </View>
        )}

        {/* 目標期間 */}
        <FormField
          label={_(msg`Goal Period`)}
          required
          error={getFieldError('goal_period')}
        >
          <SegmentedControl
            segments={goalPeriodSegments}
            value={formData.goal_period}
            onChange={(value) => updateField('goal_period', value)}
          />
        </FormField>

        {/* 時間帯 */}
        <FormField
          label={_(msg`Time of Day`)}
          required
          error={getFieldError('time_of_day')}
          hint={_(msg`Multiple selection allowed`)}
        >
          <MultiSelect
            options={timeOfDayOptions}
            value={formData.time_of_day}
            onChange={(value) => updateField('time_of_day', value as TimeOfDay[])}
          />
        </FormField>

        {/* 開始日 */}
        <FormField
          label={_(msg`Start Date`)}
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
          <Text style={styles.cancelButtonText}>{_(msg`Cancel`)}</Text>
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
            {isSubmitting ? _(msg`Saving...`) : _(msg`Save`)}
          </Text>
        </Pressable>
      </View>

      {/* キャンセル確認ダイアログ */}
      <ConfirmDialog
        visible={showCancelConfirm}
        title={_(msg`Discard Changes`)}
        message={_(msg`Your input will not be saved. Are you sure?`)}
        confirmText={_(msg`Discard`)}
        cancelText={_(msg`Continue Editing`)}
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
