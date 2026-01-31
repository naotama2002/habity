import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';

interface MultiSelectOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface MultiSelectProps<T extends string> {
  /** 選択肢 */
  options: MultiSelectOption<T>[];
  /** 現在選択されている値の配列 */
  value: T[];
  /** 選択変更時のコールバック */
  onChange: (value: T[]) => void;
  /** 最低選択数（デフォルト: 1） */
  minSelect?: number;
  /** 最大選択数（デフォルト: 無制限） */
  maxSelect?: number;
  /** 無効状態 */
  disabled?: boolean;
}

/**
 * 複数選択コンポーネント（チップ形式）
 * 曜日や時間帯の選択に使用
 */
export function MultiSelect<T extends string>({
  options,
  value,
  onChange,
  minSelect = 1,
  maxSelect,
  disabled = false,
}: MultiSelectProps<T>) {
  const handleToggle = (optionValue: T) => {
    if (disabled) return;

    const isSelected = value.includes(optionValue);

    if (isSelected) {
      // 選択解除
      if (value.length <= minSelect) {
        // 最低選択数を下回る場合は解除しない
        return;
      }
      onChange(value.filter((v) => v !== optionValue));
    } else {
      // 選択追加
      if (maxSelect && value.length >= maxSelect) {
        // 最大選択数に達している場合は追加しない
        return;
      }
      onChange([...value, optionValue]);
    }
  };

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
              disabled && styles.chipDisabled,
            ]}
            onPress={() => handleToggle(option.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={option.label}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={16}
                color={isSelected ? lightTheme.primary : lightTheme.textSecondary}
                style={styles.chipIcon}
              />
            )}
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}
            >
              {option.label}
            </Text>
            {isSelected && (
              <Ionicons
                name="checkmark"
                size={16}
                color={lightTheme.primary}
                style={styles.checkIcon}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 時間帯選択用のプリセットオプション
 */
export const timeOfDayOptions: MultiSelectOption<'anytime' | 'morning' | 'afternoon' | 'evening' | 'night'>[] = [
  { value: 'anytime', label: 'いつでも', icon: 'time-outline' },
  { value: 'morning', label: '朝', icon: 'sunny-outline' },
  { value: 'afternoon', label: '昼', icon: 'partly-sunny-outline' },
  { value: 'evening', label: '夕方', icon: 'cloudy-night-outline' },
  { value: 'night', label: '夜', icon: 'moon-outline' },
];

/**
 * 曜日選択用のプリセットオプション
 */
export const weekdayOptions: MultiSelectOption<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>[] = [
  { value: 'mon', label: '月' },
  { value: 'tue', label: '火' },
  { value: 'wed', label: '水' },
  { value: 'thu', label: '木' },
  { value: 'fri', label: '金' },
  { value: 'sat', label: '土' },
  { value: 'sun', label: '日' },
];

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  chipSelected: {
    backgroundColor: lightTheme.primaryLight,
    borderColor: lightTheme.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
  chipTextSelected: {
    color: lightTheme.primary,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
});
