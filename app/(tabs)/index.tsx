import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useHabitsWithTodayLog } from '@/state/queries/habits';
import { useToggleHabitLog } from '@/state/queries/habit-logs';
import type { HabitWithTodayLog } from '@/types/database';

export default function TodayScreen() {
  const { data: habits, isLoading, error } = useHabitsWithTodayLog();
  const toggleLog = useToggleHabitLog();

  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');

  const handleToggle = (habit: HabitWithTodayLog) => {
    toggleLog.mutate({
      habitId: habit.id,
      targetDate: dateStr,
      currentLogId: habit.log_id,
      value: habit.goal_value,
    });
  };

  const completedCount = habits?.filter((h) => h.is_completed_today).length ?? 0;
  const totalCount = habits?.length ?? 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading habits</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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

      {/* Habit List */}
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HabitCard habit={item} onToggle={() => handleToggle(item)} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>習慣がありません</Text>
            <Text style={styles.emptySubtext}>
              Habits タブから新しい習慣を追加しましょう
            </Text>
          </View>
        }
      />
    </View>
  );
}

function HabitCard({
  habit,
  onToggle,
}: {
  habit: HabitWithTodayLog;
  onToggle: () => void;
}) {
  const isCompleted = habit.is_completed_today;

  return (
    <Pressable
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onToggle}
    >
      <View style={styles.cardContent}>
        <View
          style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
        >
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.habitName, isCompleted && styles.habitNameCompleted]}>
            {habit.name}
          </Text>
          {habit.tracking_type !== 'boolean' && (
            <Text style={styles.goalText}>
              {habit.goal_value} {habit.goal_unit}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    color: '#6b7280',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 100,
    color: '#ef4444',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    minWidth: 60,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    minWidth: 40,
    textAlign: 'right',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardCompleted: {
    backgroundColor: '#ecfdf5',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardText: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  habitNameCompleted: {
    color: '#059669',
  },
  goalText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});
