import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHabits } from '@/state/queries/habits';
import { HabitListItem } from '@/components/habits';
import { SearchInput, SegmentedControl } from '@/components/ui';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import type { Habit, HabitStatus } from '@/types/database';

/**
 * フィルターの選択肢
 */
type FilterValue = 'all' | 'active' | 'archived';

const FILTER_SEGMENTS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: 'アクティブ' },
  { value: 'archived', label: 'アーカイブ' },
];

/**
 * Habits 画面
 * 全習慣をカテゴリ別に管理
 * docs/04-ui-design.md「2. Habits 画面」を参照
 */
export default function HabitsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // フィルターに応じたステータスを決定
  const statusFilter: HabitStatus | undefined =
    filter === 'all' ? undefined : filter === 'active' ? 'active' : 'archived';

  const { data: habits, isLoading, error } = useHabits(statusFilter);

  // 検索フィルタリング
  const filteredHabits = useMemo(() => {
    if (!habits) return [];
    if (!searchQuery.trim()) return habits;

    const query = searchQuery.toLowerCase();
    return habits.filter(
      (habit) =>
        habit.name.toLowerCase().includes(query) ||
        habit.description?.toLowerCase().includes(query)
    );
  }, [habits, searchQuery]);

  // カテゴリ別にグループ化
  const groupedHabits = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    const uncategorized: Habit[] = [];

    for (const habit of filteredHabits) {
      if (habit.category_id) {
        // TODO: カテゴリ名を取得してグループ化
        const categoryKey = habit.category_id;
        if (!groups[categoryKey]) {
          groups[categoryKey] = [];
        }
        groups[categoryKey].push(habit);
      } else {
        uncategorized.push(habit);
      }
    }

    return { groups, uncategorized };
  }, [filteredHabits]);

  // 習慣編集画面へ遷移
  const handlePressHabit = (habit: Habit) => {
    router.navigate(`/habit/${habit.id}/edit`);
  };

  // 新規作成画面へ遷移
  const handleAddHabit = () => {
    router.navigate('/habit/new');
  };

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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Habits</Text>
          <Pressable style={styles.addButton} onPress={handleAddHabit}>
            <Ionicons name="add" size={24} color={colors.white} />
          </Pressable>
        </View>

        {/* 検索バー */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          rightIcon={searchQuery ? 'close-circle' : undefined}
          onRightIconPress={() => setSearchQuery('')}
        />

        {/* フィルター */}
        <View style={styles.filterContainer}>
          <SegmentedControl
            segments={FILTER_SEGMENTS}
            value={filter}
            onChange={setFilter}
          />
        </View>
      </View>

      {/* 習慣リスト */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredHabits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="list-outline"
              size={48}
              color={lightTheme.textTertiary}
            />
            <Text style={styles.emptyText}>
              {searchQuery ? '検索結果がありません' : '習慣がありません'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? '別のキーワードで検索してみてください'
                : '新しい習慣を追加して始めましょう'}
            </Text>
          </View>
        ) : (
          <>
            {/* 未分類の習慣 */}
            {groupedHabits.uncategorized.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    未分類 ({groupedHabits.uncategorized.length})
                  </Text>
                </View>
                <View style={styles.sectionContent}>
                  {groupedHabits.uncategorized.map((habit) => (
                    <HabitListItem
                      key={habit.id}
                      habit={habit}
                      streak={0} // TODO: ストリーク計算
                      onPress={handlePressHabit}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* カテゴリ別の習慣 */}
            {Object.entries(groupedHabits.groups).map(([categoryId, categoryHabits]) => (
              <View key={categoryId} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {/* TODO: カテゴリ名を表示 */}
                    カテゴリ ({categoryHabits.length})
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={lightTheme.textSecondary}
                  />
                </View>
                <View style={styles.sectionContent}>
                  {categoryHabits.map((habit) => (
                    <HabitListItem
                      key={habit.id}
                      habit={habit}
                      streak={0}
                      onPress={handlePressHabit}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={handleAddHabit}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
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
  },
  header: {
    backgroundColor: lightTheme.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filterContainer: {
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100, // FAB の余白
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodySmallMedium,
    color: lightTheme.textSecondary,
  },
  sectionContent: {
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyText: {
    ...typography.h4,
    color: lightTheme.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: lightTheme.textTertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing['2xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
