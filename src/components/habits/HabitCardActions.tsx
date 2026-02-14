import {useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {msg} from '@lingui/macro';
import {useLingui} from '@lingui/react';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';

interface HabitCardActionsProps {
  isCompleted: boolean;
  isSkipped: boolean;
  onSkip: () => void;
  onUnskip: () => void;
  onUncomplete: () => void;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * HabitCard のアクションメニュー
 * カード右端に三点リーダーボタンを配置し、クリックでドロップダウンメニューを表示
 */
export function HabitCardActions({
  isCompleted,
  isSkipped,
  onSkip,
  onUnskip,
  onUncomplete,
  onOpenChange,
  children,
}: HabitCardActionsProps) {
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

  const handleSkip = useCallback(() => {
    setOpenWithCallback(false);
    onSkip();
  }, [setOpenWithCallback, onSkip]);

  const handleUnskip = useCallback(() => {
    setOpenWithCallback(false);
    onUnskip();
  }, [setOpenWithCallback, onUnskip]);

  const handleUncomplete = useCallback(() => {
    setOpenWithCallback(false);
    onUncomplete();
  }, [setOpenWithCallback, onUncomplete]);

  const renderMenuItems = () => {
    if (isSkipped) {
      return (
        <Pressable
          testID="habit-action-unskip"
          style={styles.dropdownItem}
          onPress={handleUnskip}
        >
          <Text style={styles.dropdownItemText}>
            {_(msg`Remove skip`)}
          </Text>
        </Pressable>
      );
    }

    if (isCompleted) {
      return (
        <Pressable
          testID="habit-action-uncomplete"
          style={styles.dropdownItem}
          onPress={handleUncomplete}
        >
          <Text style={styles.dropdownItemText}>
            {_(msg`Mark as incomplete`)}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        testID="habit-action-skip"
        style={styles.dropdownItem}
        onPress={handleSkip}
      >
        <Text style={styles.dropdownItemText}>
          {_(msg`Skip for today`)}
        </Text>
        <Text style={styles.dropdownHint}>
          {_(msg`Streak will not be broken`)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrapper, open && styles.wrapperOpen]}>
      <View style={styles.childrenContainer}>
        {children}
      </View>

      <View style={styles.menuAnchor}>
        <Pressable
          testID="habit-actions-button"
          style={styles.menuButton}
          onPress={handleToggleMenu}
          hitSlop={8}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </Pressable>

        {open && (
          <>
            <Pressable
              testID="habit-actions-overlay"
              style={styles.overlay}
              onPress={handleClose}
            />
            <View testID="habit-actions-menu" style={styles.dropdown}>
              {renderMenuItems()}
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
  dropdownHint: {
    ...typography.caption,
    color: lightTheme.textTertiary,
    marginTop: spacing.xs,
  },
});
