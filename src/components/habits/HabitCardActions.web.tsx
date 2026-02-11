import {useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {msg} from '@lingui/macro';
import {useLingui} from '@lingui/react';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';

interface HabitCardActionsProps {
  isSkipped: boolean;
  onSkip: () => void;
  onUnskip: () => void;
  children: React.ReactNode;
}

/**
 * HabitCard のアクションメニュー (Web版)
 * カード右端に三点リーダーボタンを配置し、クリックでドロップダウンメニューを表示
 */
export function HabitCardActions({
  isSkipped,
  onSkip,
  onUnskip,
  children,
}: HabitCardActionsProps) {
  const {_} = useLingui();
  const [open, setOpen] = useState(false);

  const handleToggleMenu = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSkip = useCallback(() => {
    setOpen(false);
    onSkip();
  }, [onSkip]);

  const handleUnskip = useCallback(() => {
    setOpen(false);
    onUnskip();
  }, [onUnskip]);

  return (
    <View style={styles.wrapper}>
      {children}

      {/* カード右端に絶対配置されるメニュー */}
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
              {isSkipped ? (
                <Pressable
                  testID="habit-action-unskip"
                  style={styles.dropdownItem}
                  onPress={handleUnskip}
                >
                  <Text style={styles.dropdownItemText}>
                    {_(msg`Remove skip`)}
                  </Text>
                </Pressable>
              ) : (
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
    position: 'relative',
  },
  menuAnchor: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingRight: spacing.sm,
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
