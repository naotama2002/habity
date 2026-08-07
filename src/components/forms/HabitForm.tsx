import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import {
  Input,
  MultiSelect,
  FormField,
  ConfirmDialog,
  SegmentedControl,
} from '@/components/ui';
import { RecurrencePicker } from './RecurrencePicker';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import {
  validateHabitFormFields,
  getDefaultHabitFormData,
  GOAL_MAX_WEEKLY,
  GOAL_DEFAULT_WEEKLY,
  GOAL_DEFAULT_MONTHLY,
  type HabitFormData,
} from '@/lib/validation/habit';
import { buildRRule, parseRRule } from '@/lib/recurrence';
import type { RecurrenceType } from '@/lib/recurrence';
import type { TimeOfDay, GoalPeriod } from '@/types/database';

/**
 * HabitForm に渡す onSubmit のデータ型
 * DB 保存に必要なフィールドを含む
 */
export interface HabitSubmitData {
  name: string;
  description: string | null;
  tracking_type: 'boolean';
  goal_value: number;
  goal_unit: string;
  goal_period: GoalPeriod;
  recurrence_rule: string;
  time_of_day: TimeOfDay[];
  start_date: string;
  end_date: string | null;
  category_id: string | null;
  reminder_times: string[] | null;
  reminder_enabled: boolean;
  status: 'active' | 'paused' | 'archived';
  sort_order: number;
}

interface HabitFormProps {
  /** 初期値（編集時） */
  initialValues?: Partial<HabitFormData> & { recurrence_rule?: string | null; goal_period?: GoalPeriod; goal_value?: number };
  /** 送信時のコールバック */
  onSubmit: (data: HabitSubmitData) => Promise<void>;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** 送信中フラグ */
  isSubmitting?: boolean;
}

/**
 * recurrence_rule から初期フォームデータに変換
 */
function parseInitialRecurrence(rruleStr: string | null | undefined): {
  recurrence_type: RecurrenceType;
  recurrence_weekdays: number[];
  recurrence_monthdays: number[];
  recurrence_interval: number;
} {
  if (!rruleStr) {
    return {
      recurrence_type: 'interval',
      recurrence_weekdays: [],
      recurrence_monthdays: [],
      recurrence_interval: 1,
    };
  }
  const parsed = parseRRule(rruleStr);
  return {
    recurrence_type: parsed.type,
    recurrence_weekdays: parsed.weekdays,
    recurrence_monthdays: parsed.monthdays,
    recurrence_interval: parsed.interval,
  };
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

  // 時間帯の選択肢
  const timeOfDayOptions = [
    { value: 'morning', label: _(msg`Morning`) },
    { value: 'afternoon', label: _(msg`Afternoon`) },
    { value: 'evening', label: _(msg`Evening`) },
    { value: 'night', label: _(msg`Night`) },
    { value: 'anytime', label: _(msg`Anytime`) },
  ];

  // フォームの状態
  const [formData, setFormData] = useState<HabitFormData>(() => {
    const defaults = getDefaultHabitFormData();
    const recurrenceFromRule = parseInitialRecurrence(initialValues?.recurrence_rule);

    return {
      ...defaults,
      ...initialValues,
      // recurrence_rule から分解したフィールドを設定（initialValues に直接指定があればそちらを優先）
      recurrence_type: initialValues?.recurrence_type ?? recurrenceFromRule.recurrence_type,
      recurrence_weekdays: initialValues?.recurrence_weekdays ?? recurrenceFromRule.recurrence_weekdays,
      recurrence_monthdays: initialValues?.recurrence_monthdays ?? recurrenceFromRule.recurrence_monthdays,
      recurrence_interval: initialValues?.recurrence_interval ?? recurrenceFromRule.recurrence_interval,
    };
  });

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

  // 送信処理
  const handleSubmit = async () => {
    // 全フィールドをタッチ済みにする
    setTouched(new Set(Object.keys(errors)));

    if (!isValid) {
      // バリデーションエラーがある場合はフィードバック
      const errorMessage = _(msg`There are errors in the input. Please check the fields highlighted in red.`);
      window.alert(errorMessage);
      return;
    }

    // フォームデータを DB 保存用に変換
    const goalPeriod = formData.goal_period ?? 'daily';
    const submitData: HabitSubmitData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      tracking_type: 'boolean',
      goal_value: goalPeriod === 'daily' ? 1 : formData.goal_value,
      goal_unit: 'times',
      goal_period: goalPeriod,
      recurrence_rule: buildRRule(formData.recurrence_type, {
        weekdays: formData.recurrence_weekdays,
        monthdays: formData.recurrence_monthdays,
        interval: formData.recurrence_interval,
      }),
      time_of_day: formData.time_of_day,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      category_id: formData.category_id || null,
      reminder_times: formData.reminder_times || null,
      reminder_enabled: formData.reminder_enabled ?? false,
      status: formData.status ?? 'active',
      sort_order: formData.sort_order ?? 0,
    };

    try {
      await onSubmit(submitData);
    } catch (error: unknown) {
      let message = _(msg`Failed to save. Please try again.`);
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as { message: unknown }).message);
      }
      const errorLabel = _(msg`Error`);
      window.alert(`${errorLabel}: ${message}`);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (isDirty) {
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
      behavior="padding"
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

        {/* 目標頻度 */}
        <FormField
          label={_(msg`Goal Frequency`)}
          error={getFieldError('goal_value')}
        >
          <SegmentedControl
            segments={[
              {value: 'daily', label: _(msg`Daily`)},
              {value: 'weekly', label: _(msg`Weekly`)},
              {value: 'monthly', label: _(msg`Monthly`)},
            ]}
            value={formData.goal_period ?? 'daily'}
            onChange={(value) => {
              updateField('goal_period', value as GoalPeriod);
              if (value === 'daily') {
                updateField('goal_value', 1);
              } else if (formData.goal_value <= 1) {
                // daily から切り替え時にデフォルト値を設定
                updateField('goal_value', value === 'weekly' ? GOAL_DEFAULT_WEEKLY : GOAL_DEFAULT_MONTHLY);
              } else if (value === 'weekly' && formData.goal_value > GOAL_MAX_WEEKLY) {
                // monthly → weekly で上限を超える場合はクランプ
                updateField('goal_value', GOAL_MAX_WEEKLY);
              }
              touchField('goal_value');
            }}
          />
          {formData.goal_period !== 'daily' && (
            <View style={styles.goalValueRow}>
              <Input
                value={String(formData.goal_value)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  updateField('goal_value', isNaN(num) ? 0 : num);
                }}
                onBlur={() => touchField('goal_value')}
                keyboardType="number-pad"
                style={styles.goalValueInput}
              />
              <Text style={styles.goalValueLabel}>
                {formData.goal_period === 'weekly'
                  ? _(msg`times per week`)
                  : _(msg`times per month`)}
              </Text>
            </View>
          )}
        </FormField>

        {/* 繰り返し */}
        <FormField
          label={_(msg`Recurrence`)}
          required
          error={getFieldError('recurrence')}
        >
          <RecurrencePicker
            type={formData.recurrence_type}
            weekdays={formData.recurrence_weekdays}
            monthdays={formData.recurrence_monthdays}
            interval={formData.recurrence_interval}
            onTypeChange={(value) => {
              updateField('recurrence_type', value);
              touchField('recurrence');
            }}
            onWeekdaysChange={(value) => {
              updateField('recurrence_weekdays', value);
              touchField('recurrence');
            }}
            onMonthdaysChange={(value) => {
              updateField('recurrence_monthdays', value);
              touchField('recurrence');
            }}
            onIntervalChange={(value) => {
              updateField('recurrence_interval', value);
              touchField('recurrence');
            }}
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
          <input
            type="date"
            value={formData.start_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              updateField('start_date', e.target.value);
              touchField('start_date');
            }}
            style={{
              backgroundColor: lightTheme.surfaceSecondary,
              borderRadius: borderRadius.md,
              paddingTop: spacing.sm,
              paddingBottom: spacing.sm,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: 16,
              lineHeight: '24px',
              color: lightTheme.text,
              border: 'none',
              outline: 'none',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              width: '100%',
              boxSizing: 'border-box' as const,
            }}
          />
        </FormField>

        {/* 終了日 */}
        <FormField
          label={_(msg`End Date`)}
          error={getFieldError('end_date')}
          hint={_(msg`Optional. Leave empty for an ongoing habit.`)}
        >
          <input
            type="date"
            value={formData.end_date ?? ''}
            min={formData.start_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              updateField('end_date', e.target.value || null);
              touchField('end_date');
            }}
            style={{
              backgroundColor: lightTheme.surfaceSecondary,
              borderRadius: borderRadius.md,
              paddingTop: spacing.sm,
              paddingBottom: spacing.sm,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: 16,
              lineHeight: '24px',
              color: lightTheme.text,
              border: 'none',
              outline: 'none',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              width: '100%',
              boxSizing: 'border-box' as const,
            }}
          />
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
  goalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  goalValueInput: {
    width: 72,
    textAlign: 'center',
  },
  goalValueLabel: {
    ...typography.body,
    color: lightTheme.textSecondary,
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
