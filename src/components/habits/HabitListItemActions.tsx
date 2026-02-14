import {useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {msg} from '@lingui/macro';
import {useLingui} from '@lingui/react';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';

interface HabitListItemActionsProps {
  isArchived: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * HabitListItem のアクションメニュー
 * リスト項目右端に三点リーダーボタンを配置し、クリックでドロップダウンメニューを表示
 */
export function HabitListItemActions({
  isArchived,
  onArchive,
  onUnarchive,
  onOpenChange,
  children,
}: HabitListItemActionsProps) {
  const {_} = useLingui();
  const [open, setOpen] = useState(false);

  const setOpenWithCallback = useCallback((value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  }, [onOpenChange]);

  const handleToggleMenu = useCallback(() => {
    setOpenWithCallback(!open);
  }, [setOpenWithCallback, open]);

  const handleClose = useCallback(() => {
    setOpenWithCallback(false);
  }, [setOpenWithCallback]);

  const handleArchive = useCallback(() => {
    setOpenWithCallback(false);
    onArchive();
  }, [setOpenWithCallback, onArchive]);

  const handleUnarchive = useCallback(() => {
    setOpenWithCallback(false);
    onUnarchive();
  }, [setOpenWithCallback, onUnarchive]);

  return (
    <View style={[styles.wrapper, open && styles.wrapperOpen]}>
      <View style={styles.childrenContainer}>
        {children}
      </View>

      <View style={styles.menuAnchor}>
        <Pressable
          testID="habit-list-actions-button"
          style={styles.menuButton}
          onPress={handleToggleMenu}
          hitSlop={8}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </Pressable>

        {open && (
          <>
            <Pressable
              testID="habit-list-actions-overlay"
              style={styles.overlay}
              onPress={handleClose}
            />
            <View testID="habit-list-actions-menu" style={styles.dropdown}>
              {isArchived ? (
                <Pressable
                  testID="habit-list-action-unarchive"
                  style={styles.dropdownItem}
                  onPress={handleUnarchive}
                >
                  <Text style={styles.dropdownItemText}>
                    {_(msg`Unarchive`)}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  testID="habit-list-action-archive"
                  style={styles.dropdownItem}
                  onPress={handleArchive}
                >
                  <Text style={styles.dropdownItemText}>
                    {_(msg`Archive`)}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  wrapperOpen: {
    zIndex: 9999,
  },
  childrenContainer: {
    flex: 1,
  },
  menuAnchor: {
    position: 'relative',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
    zIndex: 10,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: colors.gray[400],
    lineHeight: 24,
  },
  overlay: {
    position: 'fixed' as never,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  dropdown: {
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
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdownItemText: {
    ...typography.bodySmall,
    color: lightTheme.text,
  },
});
