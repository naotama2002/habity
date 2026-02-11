import {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator} from 'react-native';
import {msg} from '@lingui/macro';
import {useLingui} from '@lingui/react';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {format, parseISO, isToday as dateIsToday} from 'date-fns';
import {ja, enUS} from 'date-fns/locale';
import {useHabitsWithLog} from '@/state/queries/habits';
import {useToggleHabitLog, useSkipHabitLog, useUnskipHabitLog} from '@/state/queries/habit-logs';
import {calculateProgress} from '@/lib/progress';
import {HabitCard, HabitCardActions, TimeOfDaySection} from '@/components/habits';
import {DateStrip} from '@/components/date/DateStrip';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius} from '@/lib/spacing';
import {i18n} from '@/locale/i18n';
import type {HabitWithLog, TimeOfDay} from '@/types/database';

/**
 * Today 画面
 * 習慣を時間帯別に表示、日付切り替え対応
 * docs/04-ui-design.md「1. Today 画面」を参照
 */
export default function TodayScreen() {
  const {_} = useLingui();
  const router = useRouter();
  const dateLocale = i18n.locale === 'ja' ? ja : enUS;

  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );

  const {data: habits, isLoading, error} = useHabitsWithLog(selectedDate);
  const toggleLog = useToggleHabitLog();
  const skipLog = useSkipHabitLog();
  const unskipLog = useUnskipHabitLog();

  const isSelectedToday = dateIsToday(parseISO(selectedDate));

  // ヘッダータイトル
  const headerTitle = isSelectedToday
    ? _(msg`Today`)
    : format(parseISO(selectedDate), 'M/d (EEE)', {locale: dateLocale});

  // 習慣をチェックイン
  const handleToggle = (habit: HabitWithLog) => {
    toggleLog.mutate({
      habitId: habit.id,
      targetDate: selectedDate,
      currentLogId: habit.log_id,
      value: habit.goal_value,
    });
  };

  // 習慣をスキップ
  const handleSkip = (habit: HabitWithLog) => {
    skipLog.mutate({
      habitId: habit.id,
      targetDate: selectedDate,
      currentLogId: habit.log_id,
    });
  };

  // スキップを解除
  const handleUnskip = (habit: HabitWithLog) => {
    if (habit.log_id) {
      unskipLog.mutate(habit.log_id);
    }
  };

  // 習慣詳細へ遷移
  const handlePressHabit = (habit: HabitWithLog) => {
    // TODO: 習慣詳細画面へ遷移
    console.log('Navigate to habit detail:', habit.id);
  };

  // 進捗計算（スキップを分母から除外）
  const {completedCount, effectiveTotal, percentage: progress} = calculateProgress(habits ?? []);

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
          <Text style={styles.errorText}>{_(msg`Failed to load habits`)}</Text>
          <Text style={styles.errorSubtext}>{_(msg`Please try again`)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{headerTitle}</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.navigate('/habit/new')}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        {/* 日付ストリップ */}
        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* 進捗 */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {completedCount}/{effectiveTotal} {_(msg`completed`)}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
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
            <Text style={styles.emptyText}>{_(msg`No habits yet`)}</Text>
            <Text style={styles.emptySubtext}>
              {_(msg`Add a new habit to get started`)}
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
                    <HabitCardActions
                      key={habit.id}
                      isSkipped={habit.is_skipped}
                      onSkip={() => handleSkip(habit)}
                      onUnskip={() => handleUnskip(habit)}
                    >
                      <HabitCard
                        habit={habit}
                        streak={0} // TODO: ストリーク計算を実装
                        onToggle={handleToggle}
                        onPress={handlePressHabit}
                      />
                    </HabitCardActions>
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
  habits: HabitWithLog[],
): Record<TimeOfDay, HabitWithLog[]> {
  const grouped: Record<TimeOfDay, HabitWithLog[]> = {
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
