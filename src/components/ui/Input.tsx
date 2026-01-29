import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, lightTheme } from '@/lib/colors';
import { typography } from '@/lib/typography';
import { spacing, borderRadius } from '@/lib/spacing';

interface InputProps extends TextInputProps {
  /** 左側のアイコン */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** 右側のアイコン */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** 右側アイコンのタップ時コールバック */
  onRightIconPress?: () => void;
}

/**
 * テキスト入力コンポーネント
 */
export function Input({
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: InputProps) {
  return (
    <View style={styles.container}>
      {leftIcon && (
        <Ionicons
          name={leftIcon}
          size={20}
          color={lightTheme.textTertiary}
          style={styles.leftIcon}
        />
      )}
      <TextInput
        style={[
          styles.input,
          leftIcon && styles.inputWithLeftIcon,
          rightIcon && styles.inputWithRightIcon,
          style,
        ]}
        placeholderTextColor={lightTheme.textTertiary}
        {...props}
      />
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={20}
          color={lightTheme.textTertiary}
          style={styles.rightIcon}
          onPress={onRightIconPress}
        />
      )}
    </View>
  );
}

/**
 * 検索バーコンポーネント
 */
export function SearchInput(props: Omit<InputProps, 'leftIcon'>) {
  return (
    <Input
      leftIcon="search"
      placeholder="検索..."
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: borderRadius.md,
  },
  leftIcon: {
    marginLeft: spacing.md,
  },
  rightIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: lightTheme.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
});
