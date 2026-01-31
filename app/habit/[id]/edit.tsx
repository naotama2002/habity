import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HabitForm } from '@/components/forms';
import { useHabit, useUpdateHabit } from '@/state/queries/habits';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing } from '@/lib/spacing';
import type { HabitFormData } from '@/lib/validation/habit';
import type { UpdateHabitInput } from '@/types/database';

/**
 * 習慣編集画面
 * 認証チェックは NavigationController で行われるため、この画面に到達した時点で認証済み
 */
export default function EditHabitScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: habit, isLoading, error } = useHabit(id ?? '');
  const updateHabit = useUpdateHabit();

  const handleSubmit = async (data: HabitFormData) => {
    if (!id) return;

    const input: UpdateHabitInput = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      tracking_type: data.tracking_type,
      goal_value: data.goal_value,
      goal_unit: data.goal_unit,
      goal_period: data.goal_period,
      time_of_day: data.time_of_day,
      start_date: data.start_date,
      category_id: data.category_id || null,
      recurrence_rule: data.recurrence_rule || null,
      reminder_times: data.reminder_times || null,
      reminder_enabled: data.reminder_enabled ?? false,
    };

    await updateHabit.mutateAsync({ id, ...input });
    // 履歴があればback、なければトップへ
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleCancel = () => {
    // 履歴があればback、なければトップへ
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // ローディング状態
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // エラー状態
  if (error || !habit) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="close" size={24} color={lightTheme.text} />
          </Pressable>
          <Text style={styles.title}>{_(msg`Edit Habit`)}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{_(msg`Habit not found`)}</Text>
          <Pressable style={styles.backLink} onPress={handleCancel}>
            <Text style={styles.backLinkText}>{_(msg`Back`)}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 初期値を作成
  const initialValues: Partial<HabitFormData> = {
    name: habit.name,
    description: habit.description,
    tracking_type: habit.tracking_type,
    goal_value: habit.goal_value,
    goal_unit: habit.goal_unit,
    goal_period: habit.goal_period,
    time_of_day: habit.time_of_day,
    start_date: habit.start_date,
    category_id: habit.category_id,
    recurrence_rule: habit.recurrence_rule,
    reminder_times: habit.reminder_times,
    reminder_enabled: habit.reminder_enabled,
    status: habit.status,
    sort_order: habit.sort_order,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="close" size={24} color={lightTheme.text} />
        </Pressable>
        <Text style={styles.title}>{_(msg`Edit Habit`)}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* フォーム */}
      <HabitForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateHabit.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: lightTheme.text,
  },
  placeholder: {
    width: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  errorText: {
    ...typography.body,
    color: lightTheme.textSecondary,
    marginBottom: spacing.lg,
  },
  backLink: {
    padding: spacing.sm,
  },
  backLinkText: {
    ...typography.bodyMedium,
    color: colors.primary[500],
  },
});
