import {useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';
import {parseRRule} from '@/lib/recurrence';
import type {Habit} from '@/types/database';

interface HabitListItemProps {
  /** 習慣データ */
  habit: Habit;
  /** タップ時のコールバック */
  onPress?: (habit: Habit) => void;
  /** 編集モード */
  editMode?: boolean;
  /** アーカイブ済みかどうか */
  isArchived?: boolean;
  /** アーカイブ時のコールバック */
  onArchive?: () => void;
  /** アーカイブ解除時のコールバック */
  onUnarchive?: () => void;
  /** メニュー開閉通知コールバック */
  onMenuOpenChange?: (open: boolean) => void;
}

/**
 * 習慣リストアイテムコンポーネント
 * Habits 画面で使用
 */
export function HabitListItem({
  habit,
  onPress,
  editMode = false,
  isArchived = false,
  onArchive,
  onUnarchive,
  onMenuOpenChange,
}: HabitListItemProps) {
  const {_} = useLingui();
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const handlePress = () => {
    if (editMode) return;
    onPress?.(habit);
  };

  const setActionMenuOpenWithCallback = useCallback((value: boolean) => {
    setActionMenuOpen(value);
    onMenuOpenChange?.(value);
  }, [onMenuOpenChange]);

  const handleToggleMenu = useCallback(() => {
    setActionMenuOpenWithCallback(!actionMenuOpen);
  }, [setActionMenuOpenWithCallback, actionMenuOpen]);

  const handleCloseMenu = useCallback(() => {
    setActionMenuOpenWithCallback(false);
  }, [setActionMenuOpenWithCallback]);

  const handleArchive = useCallback(() => {
    setActionMenuOpenWithCallback(false);
    onArchive?.();
  }, [setActionMenuOpenWithCallback, onArchive]);

  const handleUnarchive = useCallback(() => {
    setActionMenuOpenWithCallback(false);
    onUnarchive?.();
  }, [setActionMenuOpenWithCallback, onUnarchive]);

  const weekdayLabels = [
    _(msg`Mon`), _(msg`Tue`), _(msg`Wed`), _(msg`Thu`),
    _(msg`Fri`), _(msg`Sat`), _(msg`Sun`),
  ];

  // 頻度の表示テキストを生成
  const getFrequencyText = () => {
    // goal_period ベースの表示（weekly/monthly）
    if (habit.goal_period === 'weekly') {
      return `${habit.goal_value}${_(msg`times per week`)}`;
    }
    if (habit.goal_period === 'monthly') {
      return `${habit.goal_value}${_(msg`times per month`)}`;
    }

    // daily: recurrence_rule ベースの表示
    if (!habit.recurrence_rule) {
      return _(msg`Daily`);
    }
    const parsed = parseRRule(habit.recurrence_rule);
    switch (parsed.type) {
      case 'weekly': {
        const days = parsed.weekdays.map(d => weekdayLabels[d]).join(',');
        return `${_(msg`Weekly`)} ${days}`;
      }
      case 'monthly': {
        const days = parsed.monthdays.join(',');
        return `${_(msg`Monthly`)} ${days}`;
      }
      case 'interval': {
        if (parsed.interval === 1) return _(msg`Daily`);
        return `${parsed.interval}${_(msg`days`)}`;
      }
    }
  };

  return (
    <Pressable
      style={({pressed}) => [styles.container, pressed && !editMode && styles.containerPressed]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.meta}>
            {getFrequencyText()}
          </Text>
        </View>

        {!editMode && (
          <View style={styles.right}>
            {/* アクションメニュー（⋮ボタン） */}
            <View style={styles.actionAnchor}>
              <Pressable
                testID="habit-list-actions-button"
                style={styles.actionButton}
                onPress={handleToggleMenu}
                hitSlop={8}
              >
                <Text style={styles.actionButtonText}>⋮</Text>
              </Pressable>

              {actionMenuOpen && (
                <>
                  <Pressable
                    testID="habit-list-actions-overlay"
                    style={styles.actionOverlay}
                    onPress={handleCloseMenu}
                  />
                  <View testID="habit-list-actions-menu" style={styles.actionDropdown}>
                    {isArchived ? (
                      <Pressable
                        testID="habit-list-action-unarchive"
                        style={(state) => [
                          styles.actionDropdownItem,
                          (state as unknown as {hovered?: boolean}).hovered && styles.actionDropdownItemHovered,
                        ]}
                        onPress={handleUnarchive}
                      >
                        <Text style={styles.actionDropdownItemText}>
                          {_(msg`Unarchive`)}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        testID="habit-list-action-archive"
                        style={(state) => [
                          styles.actionDropdownItem,
                          (state as unknown as {hovered?: boolean}).hovered && styles.actionDropdownItemHovered,
                        ]}
                        onPress={handleArchive}
                      >
                        <Text style={styles.actionDropdownItemText}>
                          {_(msg`Archive`)}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  containerPressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    ...typography.bodyMedium,
    color: lightTheme.text,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionAnchor: {
    position: 'relative',
    justifyContent: 'center',
    zIndex: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as never,
  },
  actionButtonText: {
    fontSize: 20,
    color: colors.gray[400],
    lineHeight: 24,
  },
  actionOverlay: {
    position: 'fixed' as never,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  actionDropdown: {
    position: 'absolute',
    top: '100%' as never,
    right: 0,
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: lightTheme.border,
    minWidth: 200,
    zIndex: 100,
    ...shadows.md,
  },
  actionDropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  actionDropdownItemHovered: {
    backgroundColor: colors.gray[100],
  },
  actionDropdownItemText: {
    ...typography.bodySmall,
    color: lightTheme.text,
  },
});
