import { useState, useCallback, useMemo } from 'react';
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
  MultiSelect,
  FormField,
  ConfirmDialog,
} from '@/components/ui';
import { RecurrencePicker } from './RecurrencePicker';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import {
  validateHabitFormFields,
  getDefaultHabitFormData,
  type HabitFormData,
} from '@/lib/validation/habit';
import { buildRRule, parseRRule } from '@/lib/recurrence';
import type { RecurrenceType } from '@/lib/recurrence';
import type { TimeOfDay } from '@/types/database';

/**
 * HabitForm に渡す onSubmit のデータ型
 * DB 保存に必要なフィールドを含む
 */
export interface HabitSubmitData {
  name: string;
  description: string | null;
  tracking_type: 'boolean';
  goal_value: 1;
  goal_unit: 'times';
  goal_period: 'daily';
  recurrence_rule: string;
  time_of_day: TimeOfDay[];
  start_date: string;
  category_id: string | null;
  reminder_times: string[] | null;
  reminder_enabled: boolean;
  status: 'active' | 'paused' | 'archived';
  sort_order: number;
}

interface HabitFormProps {
  /** 初期値（編集時） */
  initialValues?: Partial<HabitFormData> & { recurrence_rule?: string | null };
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
      const errorTitle = _(msg`Input Error`);
      const errorMessage = _(msg`There are errors in the input. Please check the fields highlighted in red.`);
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(errorTitle, errorMessage);
      }
      return;
    }

    // フォームデータを DB 保存用に変換
    const submitData: HabitSubmitData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      tracking_type: 'boolean',
      goal_value: 1,
      goal_unit: 'times',
      goal_period: 'daily',
      recurrence_rule: buildRRule(formData.recurrence_type, {
        weekdays: formData.recurrence_weekdays,
        monthdays: formData.recurrence_monthdays,
        interval: formData.recurrence_interval,
      }),
      time_of_day: formData.time_of_day,
      start_date: formData.start_date,
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
