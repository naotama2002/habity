import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HabitForm } from '@/components/forms';
import { useCreateHabit } from '@/state/queries/habits';
import { lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing } from '@/lib/spacing';
import type { HabitFormData } from '@/lib/validation/habit';
import type { CreateHabitInput } from '@/types/database';

/**
 * 習慣新規作成画面
 * 認証チェックは NavigationController で行われるため、この画面に到達した時点で認証済み
 */
export default function NewHabitScreen() {
  const router = useRouter();
  const createHabit = useCreateHabit();

  const handleSubmit = async (data: HabitFormData) => {
    const input: CreateHabitInput = {
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
      status: 'active',
      sort_order: 0,
    };

    await createHabit.mutateAsync(input);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="close" size={24} color={lightTheme.text} />
        </Pressable>
        <Text style={styles.title}>新しい習慣</Text>
        <View style={styles.placeholder} />
      </View>

      {/* フォーム */}
      <HabitForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createHabit.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
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
});
