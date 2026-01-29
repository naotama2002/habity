import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useHabitsWithTodayLog } from '@/state/queries/habits';
import { useToggleHabitLog } from '@/state/queries/habit-logs';
import { HabitCard, TimeOfDaySection } from '@/components/habits';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import type { HabitWithTodayLog, TimeOfDay } from '@/types/database';

/**
 * Today 画面
 * 今日実行すべき習慣を時間帯別に表示
 * docs/04-ui-design.md「1. Today 画面」を参照
 */
export default function TodayScreen() {
  const router = useRouter();
  const { data: habits, isLoading, error } = useHabitsWithTodayLog();
  const toggleLog = useToggleHabitLog();

  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');

  // 習慣をチェックイン
  const handleToggle = (habit: HabitWithTodayLog) => {
    toggleLog.mutate({
      habitId: habit.id,
      targetDate: dateStr,
      currentLogId: habit.log_id,
      value: habit.goal_value,
    });
  };

  // 習慣詳細へ遷移
  const handlePressHabit = (habit: HabitWithTodayLog) => {
    // TODO: 習慣詳細画面へ遷移
    console.log('Navigate to habit detail:', habit.id);
  };

  // 進捗計算
  const completedCount = habits?.filter((h) => h.is_completed_today).length ?? 0;
  const totalCount = habits?.length ?? 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // 時間帯ごとに習慣をグループ化
  const groupedHabits = groupHabitsByTimeOfDay(habits ?? []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>習慣の読み込みに失敗しました</Text>
          <Text style={styles.errorSubtext}>もう一度お試しください</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Today</Text>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        {/* 日付 & 進捗 */}
        <Text style={styles.dateText}>
          {format(today, 'yyyy年M月d日（E）', { locale: ja })}
        </Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} 完了
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>
      </View>

      {/* 習慣リスト */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {habits?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>習慣がありません</Text>
            <Text style={styles.emptySubtext}>
              新しい習慣を追加して始めましょう
            </Text>
          </View>
        ) : (
          <>
            {TIME_OF_DAY_ORDER.map((timeOfDay) => {
              const habitsInSection = groupedHabits[timeOfDay];
              if (!habitsInSection || habitsInSection.length === 0) {
                return null;
              }

              return (
                <TimeOfDaySection key={timeOfDay} timeOfDay={timeOfDay}>
                  {habitsInSection.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      streak={0} // TODO: ストリーク計算を実装
                      onToggle={handleToggle}
                      onPress={handlePressHabit}
                    />
                  ))}
                </TimeOfDaySection>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 時間帯の表示順序
 */
const TIME_OF_DAY_ORDER: TimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'anytime',
];

/**
 * 習慣を時間帯ごとにグループ化
 */
function groupHabitsByTimeOfDay(
  habits: HabitWithTodayLog[]
): Record<TimeOfDay, HabitWithTodayLog[]> {
  const grouped: Record<TimeOfDay, HabitWithTodayLog[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
    anytime: [],
  };

  for (const habit of habits) {
    // time_of_day は配列なので最初の要素を使用
    const timeOfDay = habit.time_of_day?.[0] ?? 'anytime';
    grouped[timeOfDay].push(habit);
  }

  return grouped;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  errorText: {
    ...typography.h4,
    color: colors.error[500],
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    ...typography.body,
    color: lightTheme.textSecondary,
  },
  header: {
    backgroundColor: lightTheme.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: lightTheme.text,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: colors.white,
    lineHeight: 28,
  },
  dateText: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
    marginBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
    minWidth: 64,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  progressPercent: {
    ...typography.bodySmallMedium,
    color: colors.primary[500],
    minWidth: 40,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing['2xl'],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.h4,
    color: lightTheme.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: lightTheme.textTertiary,
  },
});
