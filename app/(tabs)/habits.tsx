import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHabits, useReorderHabits, useArchiveHabit, useUnarchiveHabit } from '@/state/queries/habits';
import { HabitListItem } from '@/components/habits';
import { SearchInput, SegmentedControl, SortableList } from '@/components/ui';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';
import { buildSortOrderUpdates } from '@/lib/reorder';
import type { Habit, HabitStatus } from '@/types/database';

/**
 * フィルターの選択肢
 */
type FilterValue = 'all' | 'active' | 'archived';

/**
 * Habits 画面
 * 全習慣をカテゴリ別に管理
 * docs/04-ui-design.md「2. Habits 画面」を参照
 */
export default function HabitsScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [localHabits, setLocalHabits] = useState<Habit[]>([]);
  const [openMenuHabitId, setOpenMenuHabitId] = useState<string | null>(null);
  const reorderMutation = useReorderHabits();
  const archiveHabit = useArchiveHabit();
  const unarchiveHabit = useUnarchiveHabit();

  const FILTER_SEGMENTS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: _(msg`All`) },
    { value: 'active', label: _(msg`Active`) },
    { value: 'archived', label: _(msg`Archived`) },
  ];

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

  // 編集モード開始
  const handleStartEdit = useCallback(() => {
    if (habits) {
      setLocalHabits([...habits]);
    }
    setEditMode(true);
  }, [habits]);

  // 編集モード終了・保存
  const handleDoneEdit = useCallback(() => {
    const updates = buildSortOrderUpdates(localHabits);
    reorderMutation.mutate(updates);
    setEditMode(false);
  }, [localHabits, reorderMutation]);

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
          <View style={styles.headerActions}>
            {habits && habits.length > 0 && (
              <Pressable onPress={editMode ? handleDoneEdit : handleStartEdit}>
                <Text style={styles.editButtonText}>
                  {editMode ? _(msg`Done`) : _(msg`Edit`)}
                </Text>
              </Pressable>
            )}
            {!editMode && (
              <Pressable style={styles.addButton} onPress={handleAddHabit}>
                <Ionicons name="add" size={24} color={colors.white} />
              </Pressable>
            )}
          </View>
        </View>

        {/* 検索バー・フィルター (編集モード中は非表示) */}
        {!editMode && (
          <>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              rightIcon={searchQuery ? 'close-circle' : undefined}
              onRightIconPress={() => setSearchQuery('')}
            />
            <View style={styles.filterContainer}>
              <SegmentedControl
                segments={FILTER_SEGMENTS}
                value={filter}
                onChange={setFilter}
              />
            </View>
          </>
        )}
      </View>

      {/* 習慣リスト */}
      {editMode ? (
        localHabits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="list-outline"
              size={48}
              color={lightTheme.textTertiary}
            />
            <Text style={styles.emptyText}>{_(msg`No habits yet`)}</Text>
            <Text style={styles.emptySubtext}>
              {_(msg`Add a new habit to get started`)}
            </Text>
          </View>
        ) : (
          <SortableList
            data={localHabits}
            keyExtractor={(h) => h.id}
            renderItem={(habit) => (
              <HabitListItem habit={habit} editMode />
            )}
            onReorder={setLocalHabits}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          />
        )
      ) : (
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
                {searchQuery ? _(msg`No search results`) : _(msg`No habits yet`)}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? _(msg`Try searching with different keywords`)
                  : _(msg`Add a new habit to get started`)}
              </Text>
            </View>
          ) : (
            <>
              {/* 未分類の習慣 */}
              {groupedHabits.uncategorized.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      {_(msg`Uncategorized`)} ({groupedHabits.uncategorized.length})
                    </Text>
                  </View>
                  <View style={styles.sectionContent}>
                    {groupedHabits.uncategorized.map((habit) => (
                      <View
                        key={habit.id}
                        style={openMenuHabitId === habit.id ? {zIndex: 9999} : undefined}
                      >
                        <HabitListItem
                          habit={habit}
                          onPress={handlePressHabit}
                          isArchived={habit.status === 'archived'}
                          onArchive={() => archiveHabit.mutate(habit.id)}
                          onUnarchive={() => unarchiveHabit.mutate(habit.id)}
                          onMenuOpenChange={(isOpen) => setOpenMenuHabitId(isOpen ? habit.id : null)}
                        />
                      </View>
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
                      {_(msg`Category`)} ({categoryHabits.length})
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={lightTheme.textSecondary}
                    />
                  </View>
                  <View style={styles.sectionContent}>
                    {categoryHabits.map((habit) => (
                      <View
                        key={habit.id}
                        style={openMenuHabitId === habit.id ? {zIndex: 9999} : undefined}
                      >
                        <HabitListItem
                          habit={habit}
                          onPress={handlePressHabit}
                          isArchived={habit.status === 'archived'}
                          onArchive={() => archiveHabit.mutate(habit.id)}
                          onUnarchive={() => unarchiveHabit.mutate(habit.id)}
                          onMenuOpenChange={(isOpen) => setOpenMenuHabitId(isOpen ? habit.id : null)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB (編集モード中は非表示) */}
      {!editMode && (
        <Pressable style={styles.fab} onPress={handleAddHabit}>
          <Ionicons name="add" size={28} color={colors.white} />
        </Pressable>
      )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  editButtonText: {
    ...typography.bodyMedium,
    color: colors.primary[500],
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
