import {View, Text, StyleSheet, Pressable} from 'react-native';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react';
import {SegmentedControl, Input} from '@/components/ui';
import {lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius} from '@/lib/spacing';
import type {RecurrenceType} from '@/lib/recurrence';

interface RecurrencePickerProps {
  type: RecurrenceType;
  weekdays: number[];
  monthdays: number[];
  interval: number;
  onTypeChange: (type: RecurrenceType) => void;
  onWeekdaysChange: (weekdays: number[]) => void;
  onMonthdaysChange: (monthdays: number[]) => void;
  onIntervalChange: (interval: number) => void;
  error?: string | null;
}

export function RecurrencePicker({
  type,
  weekdays,
  monthdays,
  interval,
  onTypeChange,
  onWeekdaysChange,
  onMonthdaysChange,
  onIntervalChange,
  error,
}: RecurrencePickerProps) {
  const {_} = useLingui();

  const typeSegments: {value: RecurrenceType; label: string}[] = [
    {value: 'weekly', label: _(msg`Weekly`)},
    {value: 'monthly', label: _(msg`Monthly`)},
    {value: 'interval', label: _(msg`Interval`)},
  ];

  const weekdayLabels = [
    _(msg`Mon`),
    _(msg`Tue`),
    _(msg`Wed`),
    _(msg`Thu`),
    _(msg`Fri`),
    _(msg`Sat`),
    _(msg`Sun`),
  ];

  const toggleWeekday = (day: number) => {
    if (weekdays.includes(day)) {
      onWeekdaysChange(weekdays.filter(d => d !== day));
    } else {
      onWeekdaysChange([...weekdays, day].sort((a, b) => a - b));
    }
  };

  const toggleMonthday = (day: number) => {
    if (monthdays.includes(day)) {
      onMonthdaysChange(monthdays.filter(d => d !== day));
    } else {
      onMonthdaysChange([...monthdays, day].sort((a, b) => a - b));
    }
  };

  return (
    <View style={styles.container}>
      <SegmentedControl
        segments={typeSegments}
        value={type}
        onChange={onTypeChange}
      />

      {type === 'weekly' && (
        <View style={styles.optionSection}>
          <Text style={styles.hint}>
            {_(msg`Select days of the week`)}
          </Text>
          <View style={styles.weekdayRow}>
            {weekdayLabels.map((label, index) => {
              const isSelected = weekdays.includes(index);
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.weekdayChip,
                    isSelected && styles.weekdayChipSelected,
                  ]}
                  onPress={() => toggleWeekday(index)}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: isSelected}}
                  accessibilityLabel={label}
                >
                  <Text
                    style={[
                      styles.weekdayText,
                      isSelected && styles.weekdayTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {type === 'monthly' && (
        <View style={styles.optionSection}>
          <View style={styles.monthHeaderRow}>
            <Text style={styles.hint}>
              {_(msg`Select days of the month`)}
            </Text>
            <View style={styles.bulkActionRow}>
              <Pressable
                onPress={() => onMonthdaysChange(Array.from({length: 31}, (_, i) => i + 1))}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Select all`)}
                testID="monthday-select-all"
              >
                <Text style={styles.bulkActionText}>{_(msg`Select all`)}</Text>
              </Pressable>
              <Text style={styles.bulkActionSeparator}>|</Text>
              <Pressable
                onPress={() => onMonthdaysChange([])}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Clear all`)}
                testID="monthday-clear-all"
              >
                <Text style={styles.bulkActionText}>{_(msg`Clear all`)}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.monthdayGrid}>
            {Array.from({length: 31}, (_, i) => i + 1).map(day => {
              const isSelected = monthdays.includes(day);
              return (
                <Pressable
                  key={day}
                  style={[
                    styles.monthdayChip,
                    isSelected && styles.monthdayChipSelected,
                  ]}
                  onPress={() => toggleMonthday(day)}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: isSelected}}
                  accessibilityLabel={String(day)}
                >
                  <Text
                    style={[
                      styles.monthdayText,
                      isSelected && styles.monthdayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {type === 'interval' && (
        <View style={styles.optionSection}>
          <View style={styles.intervalRow}>
            <View style={styles.intervalInputWrapper}>
              <Input
                value={interval.toString()}
                onChangeText={value => {
                  const num = parseInt(value, 10);
                  onIntervalChange(isNaN(num) ? 1 : num);
                }}
                keyboardType="number-pad"
                testID="interval-input"
              />
            </View>
            <Text style={styles.intervalLabel}>{_(msg`days`)}</Text>
          </View>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  optionSection: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  hint: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekdayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: lightTheme.surfaceSecondary,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  weekdayChipSelected: {
    backgroundColor: lightTheme.primaryLight,
    borderColor: lightTheme.primary,
  },
  weekdayText: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
  weekdayTextSelected: {
    color: lightTheme.primary,
    fontWeight: '600',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bulkActionText: {
    ...typography.bodySmall,
    color: lightTheme.primary,
  },
  bulkActionSeparator: {
    ...typography.bodySmall,
    color: lightTheme.textTertiary,
  },
  monthdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  monthdayChip: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: lightTheme.surfaceSecondary,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  monthdayChipSelected: {
    backgroundColor: lightTheme.primaryLight,
    borderColor: lightTheme.primary,
  },
  monthdayText: {
    ...typography.bodySmall,
    color: lightTheme.textSecondary,
  },
  monthdayTextSelected: {
    color: lightTheme.primary,
    fontWeight: '600',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intervalInputWrapper: {
    width: 80,
  },
  intervalLabel: {
    ...typography.body,
    color: lightTheme.textSecondary,
  },
  errorText: {
    ...typography.bodySmall,
    color: lightTheme.error,
    marginTop: spacing.xs,
  },
});
