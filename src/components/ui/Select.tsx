import { View, Text, StyleSheet, Pressable, Modal, FlatList, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  /** 選択肢 */
  options: SelectOption<T>[];
  /** 現在選択されている値 */
  value: T | null;
  /** 選択変更時のコールバック */
  onChange: (value: T) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** 無効状態 */
  disabled?: boolean;
}

/**
 * セレクトコンポーネント
 * カテゴリ選択など単一選択に使用
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder = '選択してください',
  disabled = false,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (selectedValue: T) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selectedOption?.label ?? placeholder}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.triggerPlaceholder,
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={lightTheme.textTertiary}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>選択</Text>
            <Pressable onPress={() => setIsOpen(false)}>
              <Ionicons name="close" size={24} color={lightTheme.text} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.option,
                  item.value === value && styles.optionSelected,
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    item.value === value && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={lightTheme.primary}
                  />
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    ...typography.body,
    color: lightTheme.text,
    flex: 1,
  },
  triggerPlaceholder: {
    color: lightTheme.textTertiary,
  },
  modal: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  modalTitle: {
    ...typography.h4,
    color: lightTheme.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.borderLight,
  },
  optionSelected: {
    backgroundColor: lightTheme.primaryLight,
  },
  optionText: {
    ...typography.body,
    color: lightTheme.text,
  },
  optionTextSelected: {
    color: lightTheme.primary,
    fontWeight: '600',
  },
});
