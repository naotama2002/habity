import {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, Pressable, Linking} from 'react-native';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius, shadows} from '@/lib/spacing';
import {extractUrls} from '@/lib/url';
import {StreakBadge} from './StreakBadge';
import type {HabitWithLog} from '@/types/database';

interface HabitCardProps {
  /** 習慣データ */
  habit: HabitWithLog;
  /** ストリーク日数 */
  streak?: number;
  /** チェックイン時のコールバック */
  onToggle?: (habit: HabitWithLog) => void;
  /** スキップ時のコールバック */
  onSkip?: () => void;
  /** スキップ解除時のコールバック */
  onUnskip?: () => void;
  /** 完了解除時のコールバック */
  onUncomplete?: () => void;
  /** メニュー開閉通知コールバック（リンクメニュー or アクションメニュー） */
  onMenuOpenChange?: (open: boolean) => void;
  /**
   * 一覧クエリが最後にサーバ応答を受け取った時刻 (React Query の dataUpdatedAt)。
   *
   * 楽観表示をサーバ状態へ戻すためのトリガーとして使う。
   * habit.is_completed だけを依存にすると、ミューテーションが失敗して
   * サーバ状態が「変わらなかった」場合に同期が走らず、
   * チェックが付いたままなのに未記録という状態で固着する。
   * dataUpdatedAt は内容が同一でも再取得のたびに変わるため、
   * 失敗時にも確実に戻せる。
   */
  syncedAt?: number;
}

/**
 * 習慣カードコンポーネント
 * Today 画面で使用する習慣表示カード
 */
export function HabitCard({
  habit,
  streak = 0,
  onToggle,
  onSkip,
  onUnskip,
  onUncomplete,
  onMenuOpenChange,
  syncedAt,
}: HabitCardProps) {
  const {_} = useLingui();
  const isSkipped = habit.is_skipped;
  const isCompleted = habit.is_completed;

  // ローカル楽観的更新: チェックマークを即座に表示
  const [optimisticCompleted, setOptimisticCompleted] = useState(habit.is_completed);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // サーバーからの確定データで同期
  // syncedAt を依存に含めることで、ミューテーション失敗によりサーバ状態が
  // 変化しなかった場合でも、再取得のたびに楽観表示を巻き戻せる。
  useEffect(() => {
    setOptimisticCompleted(habit.is_completed);
  }, [habit.is_completed, habit.log_id, syncedAt]);

  const urls = useMemo(() => extractUrls(habit.description), [habit.description]);

  // 緑フラッシュアニメーション用 shared value (0 = 透明, 1 = 不透明)
  const flashOpacity = useSharedValue(0);

  const handleToggle = () => {
    if (isSkipped) return; // スキップ中はトグル不可

    // 連打時に前のフラッシュアニメーションが残らないようキャンセル
    cancelAnimation(flashOpacity);
    flashOpacity.value = 0;

    const willComplete = !optimisticCompleted;

    // 1. チェックマークを即座に表示/非表示
    setOptimisticCompleted(willComplete);

    // 2. 完了時のみ: 緑フラッシュをチェックの後に再生
    if (willComplete) {
      flashOpacity.value = withDelay(
        100,
        withSequence(
          withTiming(1, {duration: 200}),
          withTiming(0, {duration: 300}),
        ),
      );
    }

    // 3. サーバーに送信
    onToggle?.(habit);
  };

  // メニュー開閉の通知（リンク or アクションどちらかが開いたら true）
  const notifyMenuChange = useCallback((linkOpen: boolean, actionOpen: boolean) => {
    onMenuOpenChange?.(linkOpen || actionOpen);
  }, [onMenuOpenChange]);

  // --- リンクメニュー ---
  const setLinkMenuOpenWithCallback = useCallback((value: boolean) => {
    setLinkMenuOpen(value);
    // リンクメニューが開いたらアクションメニューを閉じる
    if (value) {
      setActionMenuOpen(false);
    }
    notifyMenuChange(value, false);
  }, [notifyMenuChange]);

  const handleToggleLinkMenu = useCallback(() => {
    setLinkMenuOpenWithCallback(!linkMenuOpen);
  }, [setLinkMenuOpenWithCallback, linkMenuOpen]);

  const handleCloseLinkMenu = useCallback(() => {
    setLinkMenuOpenWithCallback(false);
  }, [setLinkMenuOpenWithCallback]);

  const handleOpenUrl = useCallback((url: string) => {
    setLinkMenuOpenWithCallback(false);
    Linking.openURL(url);
  }, [setLinkMenuOpenWithCallback]);

  // --- アクションメニュー ---
  const setActionMenuOpenWithCallback = useCallback((value: boolean) => {
    setActionMenuOpen(value);
    // アクションメニューが開いたらリンクメニューを閉じる
    if (value) {
      setLinkMenuOpen(false);
    }
    notifyMenuChange(false, value);
  }, [notifyMenuChange]);

  const handleToggleActionMenu = useCallback(() => {
    setActionMenuOpenWithCallback(!actionMenuOpen);
  }, [setActionMenuOpenWithCallback, actionMenuOpen]);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenuOpenWithCallback(false);
  }, [setActionMenuOpenWithCallback]);

  const handleSkip = useCallback(() => {
    setActionMenuOpenWithCallback(false);
    onSkip?.();
  }, [setActionMenuOpenWithCallback, onSkip]);

  const handleUnskip = useCallback(() => {
    setActionMenuOpenWithCallback(false);
    onUnskip?.();
  }, [setActionMenuOpenWithCallback, onUnskip]);

  const handleUncomplete = useCallback(() => {
    setActionMenuOpenWithCallback(false);
    onUncomplete?.();
  }, [setActionMenuOpenWithCallback, onUncomplete]);

  const renderActionMenuItems = () => {
    if (isSkipped) {
      return (
        <Pressable
          testID="habit-action-unskip"
          style={(state) => [
            styles.actionDropdownItem,
            (state as unknown as {hovered?: boolean}).hovered && styles.actionDropdownItemHovered,
          ]}
          onPress={handleUnskip}
        >
          <Text style={styles.actionDropdownItemText}>
            {_(msg`Remove skip`)}
          </Text>
        </Pressable>
      );
    }

    if (isCompleted) {
      return (
        <Pressable
          testID="habit-action-uncomplete"
          style={(state) => [
            styles.actionDropdownItem,
            (state as unknown as {hovered?: boolean}).hovered && styles.actionDropdownItemHovered,
          ]}
          onPress={handleUncomplete}
        >
          <Text style={styles.actionDropdownItemText}>
            {_(msg`Mark as incomplete`)}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        testID="habit-action-skip"
        style={(state) => [
          styles.actionDropdownItem,
          (state as unknown as {hovered?: boolean}).hovered && styles.actionDropdownItemHovered,
        ]}
        onPress={handleSkip}
      >
        <Text style={styles.actionDropdownItemText}>
          {_(msg`Skip for today`)}
        </Text>
        <Text style={styles.actionDropdownHint}>
          {_(msg`Streak will not be broken`)}
        </Text>
      </Pressable>
    );
  };

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // コンテナスタイルの決定
  const containerStyle = [
    styles.container,
    optimisticCompleted && styles.containerCompleted,
    isSkipped && styles.containerSkipped,
  ];

  // チェックボックススタイルの決定
  const checkboxStyle = [
    styles.checkbox,
    optimisticCompleted && styles.checkboxCompleted,
    isSkipped && styles.checkboxSkipped,
  ];

  // 名前スタイルの決定
  const nameStyle = [
    styles.name,
    optimisticCompleted && styles.nameCompleted,
    isSkipped && styles.nameSkipped,
  ];

  return (
      <View
        testID="habit-card"
        style={containerStyle}
      >
        {/* 緑フラッシュオーバーレイ */}
        <Animated.View
          style={[styles.flashOverlay, flashStyle]}
          pointerEvents="none"
        />

        {/* チェックボックス */}
        <Pressable
          testID="habit-checkbox"
          style={checkboxStyle}
          onPress={handleToggle}
          hitSlop={8}
        >
          {optimisticCompleted && <Text style={styles.checkmark}>✓</Text>}
          {isSkipped && <Text style={styles.skipMark}>⊘</Text>}
        </Pressable>

        {/* コンテンツ */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={nameStyle} numberOfLines={1}>
              {habit.name}
            </Text>
            {isSkipped && (
              <Text style={styles.skipLabel}>{_(msg`Skipped`)}</Text>
            )}
          </View>
        </View>

        {/* リンクボタン */}
        {urls.length > 0 && (
          <View style={styles.linkAnchor}>
            <Pressable
              testID="habit-link-button"
              style={styles.linkButton}
              onPress={handleToggleLinkMenu}
              hitSlop={8}
            >
              <Text style={styles.linkButtonText}>{'🔗'}</Text>
            </Pressable>

            {linkMenuOpen && (
              <>
                <Pressable
                  testID="habit-link-overlay"
                  style={styles.linkOverlay}
                  onPress={handleCloseLinkMenu}
                />
                <View testID="habit-link-menu" style={styles.linkDropdown}>
                  {urls.map((url) => (
                    <Pressable
                      key={url}
                      style={(state) => [
                        styles.linkDropdownItem,
                        (state as unknown as {hovered?: boolean}).hovered && styles.linkDropdownItemHovered,
                      ]}
                      onPress={() => handleOpenUrl(url)}
                    >
                      <Text style={styles.linkDropdownItemText} numberOfLines={1}>
                        {url}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* 期間進捗 (weekly/monthly) */}
        {habit.goal_period !== 'daily' && (
          <View testID="period-progress" style={styles.periodProgress}>
            <Text style={[
              styles.periodProgressText,
              isCompleted && styles.periodProgressTextCompleted,
            ]}>
              {habit.period_completed_count}/{habit.goal_value}
            </Text>
          </View>
        )}

        {/* ストリーク */}
        <StreakBadge
          testID="habit-streak-badge"
          streak={streak}
          inactive={!optimisticCompleted && !isSkipped}
        />

        {/* アクションメニュー（⋮ボタン） */}
        <View style={styles.actionAnchor}>
          <Pressable
            testID="habit-actions-button"
            style={styles.actionButton}
            onPress={handleToggleActionMenu}
            hitSlop={8}
          >
            <Text style={styles.actionButtonText}>⋮</Text>
          </Pressable>

          {actionMenuOpen && (
            <>
              <Pressable
                testID="habit-actions-overlay"
                style={styles.actionOverlay}
                onPress={handleCloseActionMenu}
              />
              <View testID="habit-actions-menu" style={styles.actionDropdown}>
                {renderActionMenuItems()}
              </View>
            </>
          )}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: lightTheme.border,
    ...shadows.sm,
  },
  containerCompleted: {
    backgroundColor: lightTheme.surfaceSecondary,
    borderColor: lightTheme.borderLight,
  },
  containerSkipped: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.7,
  },
  flashOverlay: {
    // RN 0.86 で StyleSheet.absoluteFillObject が削除されたため展開して記述する
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.success[100],
    borderRadius: borderRadius.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as never,
  },
  checkboxCompleted: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  checkboxSkipped: {
    backgroundColor: colors.gray[300],
    borderColor: colors.gray[300],
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  skipMark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyMedium,
    color: lightTheme.text,
    flex: 1,
  },
  nameCompleted: {
    color: lightTheme.textSecondary,
    textDecorationLine: 'line-through',
  },
  nameSkipped: {
    color: lightTheme.textTertiary,
    textDecorationLine: 'line-through',
  },
  skipLabel: {
    ...typography.bodySmall,
    color: colors.gray[400],
  },
  periodProgress: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
  },
  periodProgressText: {
    ...typography.bodySmallMedium,
    color: colors.primary[600],
  },
  periodProgressTextCompleted: {
    color: colors.success[600],
  },
  linkAnchor: {
    position: 'relative',
    justifyContent: 'center',
    zIndex: 10,
  },
  linkButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as never,
  },
  linkButtonText: {
    fontSize: 16,
    color: colors.primary[500],
    lineHeight: 20,
  },
  linkOverlay: {
    position: 'fixed' as never,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  linkDropdown: {
    position: 'absolute',
    top: '100%' as never,
    right: 0,
    backgroundColor: lightTheme.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: lightTheme.border,
    minWidth: 220,
    maxWidth: 320,
    zIndex: 100,
    ...shadows.md,
  },
  linkDropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  linkDropdownItemHovered: {
    backgroundColor: colors.gray[100],
  },
  linkDropdownItemText: {
    ...typography.bodySmall,
    color: colors.primary[600],
  },
  actionAnchor: {
    position: 'relative',
    justifyContent: 'center',
    zIndex: 10,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as never,
  },
  actionButtonText: {
    fontSize: 18,
    color: colors.gray[400],
    lineHeight: 20,
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
  actionDropdownHint: {
    ...typography.caption,
    color: lightTheme.textTertiary,
    marginTop: spacing.xs,
  },
});
