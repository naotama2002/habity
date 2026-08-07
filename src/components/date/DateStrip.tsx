import {useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react';
import {addDays, format, isToday, isTomorrow} from 'date-fns';
import {ja, enUS} from 'date-fns/locale';
import {colors, lightTheme} from '@/lib/colors';
import {typography} from '@/lib/typography';
import {spacing, borderRadius} from '@/lib/spacing';
import {i18n} from '@/locale/i18n';

interface DateStripProps {
  selectedDate: string; // 'yyyy-MM-dd'
  onSelectDate: (date: string) => void;
}

const DAYS_BEFORE = 7;
const DAYS_AFTER = 1;
const ITEM_WIDTH = 52;
const ITEM_GAP = 8;

function generateDates(): Date[] {
  const today = new Date();
  const dates: Date[] = [];
  for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) {
    dates.push(addDays(today, i));
  }
  return dates;
}

export function DateStrip({selectedDate, onSelectDate}: DateStripProps) {
  const {_} = useLingui();
  const scrollRef = useRef<ScrollView>(null);
  const containerWidth = useRef(0);
  const dates = generateDates();
  const dateLocale = i18n.locale === 'ja' ? ja : enUS;

  const scrollToToday = useCallback(() => {
    if (!scrollRef.current || containerWidth.current === 0) return;
    const todayIndex = DAYS_BEFORE; // today is always at index 7
    const itemTotalWidth = ITEM_WIDTH + ITEM_GAP;
    const scrollX =
      todayIndex * itemTotalWidth -
      containerWidth.current / 2 +
      ITEM_WIDTH / 2;
    scrollRef.current.scrollTo({x: Math.max(0, scrollX), animated: false});
  }, []);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.current = e.nativeEvent.layout.width;
      scrollToToday();
    },
    [scrollToToday],
  );

  useEffect(() => {
    // Scroll to today on mount (fallback for when layout fires before ref is ready)
    const timeout = setTimeout(scrollToToday, 50);
    return () => clearTimeout(timeout);
  }, [scrollToToday]);

  return (
    <View testID="date-strip" style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onLayout={handleLayout}
      >
        {dates.map(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const isSelected = dateKey === selectedDate;
          const dayOfWeek = format(date, 'EEEEE', {locale: dateLocale});
          const dayOfMonth = format(date, 'd');
          const isTodayDate = isToday(date);
          const isTomorrowDate = isTomorrow(date);

          return (
            <Pressable
              key={dateKey}
              testID={`date-item-${dateKey}`}
              style={[
                styles.dateItem,
                isSelected && styles.dateItemSelected,
              ]}
              onPress={() => onSelectDate(dateKey)}
            >
              <Text
                style={[
                  styles.dayOfWeek,
                  isSelected && styles.textSelected,
                ]}
              >
                {dayOfWeek}
              </Text>
              <Text
                style={[
                  styles.dayOfMonth,
                  isSelected && styles.textSelected,
                ]}
              >
                {dayOfMonth}
              </Text>
              {isTodayDate && (
                <Text
                  testID="date-today-label"
                  style={[
                    styles.todayLabel,
                    isSelected && styles.todayLabelSelected,
                  ]}
                >
                  {_(msg`Today`)}
                </Text>
              )}
              {isTomorrowDate && !isTodayDate && (
                <Text
                  style={[
                    styles.todayLabel,
                    isSelected && styles.todayLabelSelected,
                  ]}
                >
                  {_(msg`Tomorrow`)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: ITEM_GAP,
  },
  dateItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  dateItemSelected: {
    backgroundColor: colors.primary[500],
  },
  dayOfWeek: {
    ...typography.caption,
    color: lightTheme.textSecondary,
  },
  dayOfMonth: {
    ...typography.bodyMedium,
    color: lightTheme.text,
    marginTop: 2,
  },
  textSelected: {
    color: colors.white,
  },
  todayLabel: {
    ...typography.caption,
    color: colors.primary[500],
    marginTop: 2,
    fontSize: 10,
  },
  todayLabelSelected: {
    color: colors.white,
  },
});
