import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHabits } from '@/state/queries/habits';
import type { Habit } from '@/types/database';

export default function HabitsScreen() {
  const { data: habits, isLoading, error } = useHabits('active');

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
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HabitListItem habit={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="add-circle-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>習慣がありません</Text>
            <Text style={styles.emptySubtext}>
              下のボタンから新しい習慣を追加しましょう
            </Text>
          </View>
        }
      />

      {/* FAB - Add Habit */}
      <Link href="/habits/new" asChild>
        <Pressable style={styles.fab}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      </Link>
    </View>
  );
}

function HabitListItem({ habit }: { habit: Habit }) {
  const trackingTypeLabel = {
    boolean: 'チェック',
    numeric: '数値',
    duration: '時間',
  };

  return (
    <Link href={`/habits/${habit.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardText}>
            <Text style={styles.habitName}>{habit.name}</Text>
            <Text style={styles.habitMeta}>
              {trackingTypeLabel[habit.tracking_type]}
              {habit.tracking_type !== 'boolean' &&
                ` • ${habit.goal_value} ${habit.goal_unit}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </Pressable>
    </Link>
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  habitMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
