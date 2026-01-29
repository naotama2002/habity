import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';

interface SegmentedControlProps<T extends string> {
  /** セグメントの選択肢 */
  segments: { value: T; label: string }[];
  /** 現在選択されている値 */
  value: T;
  /** 選択変更時のコールバック */
  onChange: (value: T) => void;
}

/**
 * セグメントコントロール
 * フィルター切り替えなどに使用
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {segments.map((segment) => {
        const isSelected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            onPress={() => onChange(segment.value)}
          >
            <Text
              style={[styles.segmentText, isSelected && styles.segmentTextSelected]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md - 2,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: lightTheme.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    ...typography.bodySmallMedium,
    color: lightTheme.textSecondary,
  },
  segmentTextSelected: {
    color: lightTheme.text,
  },
});
