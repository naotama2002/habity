import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useHabits } from '@/state/queries/habits';

export default function StatsScreen() {
  const { data: habits } = useHabits('active');

  const totalHabits = habits?.length ?? 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>--</Text>
            <Text style={styles.summaryLabel}>達成率</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalHabits}</Text>
            <Text style={styles.summaryLabel}>習慣数</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>--</Text>
            <Text style={styles.summaryLabel}>最長連続</Text>
          </View>
        </View>

        {/* Placeholder for Charts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>週間達成率</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              グラフは今後実装予定です
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>習慣別達成率</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              統計情報は今後実装予定です
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6366f1',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  placeholder: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
