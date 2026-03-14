import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserSettings, useUpdateUserSettings } from '@/state/queries/user-settings';
import { usePushStatus, useSubscribePush, useUnsubscribePush } from '@/state/queries/push-subscriptions';

const MAX_NOTIFICATION_TIMES = 5;

export default function NotificationsScreen() {
  const { _ } = useLingui();
  const router = useRouter();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: pushStatus } = usePushStatus();
  const subscribePush = useSubscribePush();
  const unsubscribePush = useUnsubscribePush();

  const [newTime, setNewTime] = useState('08:00');

  const notificationsEnabled = settings?.notifications_enabled ?? false;
  const notificationTimes = useMemo(
    () => settings?.notification_times ?? ['08:00'],
    [settings?.notification_times],
  );

  const handleToggleNotifications = useCallback(
    async (value: boolean) => {
      if (value && pushStatus && !pushStatus.isSubscribed) {
        // Push subscribe を試行するが、失敗しても設定は更新する
        await subscribePush.mutateAsync().catch(() => {});
      } else if (!value && pushStatus?.isSubscribed) {
        await unsubscribePush.mutateAsync().catch(() => {});
      }

      updateSettings.mutate({ notifications_enabled: value });
    },
    [pushStatus, subscribePush, unsubscribePush, updateSettings],
  );

  const handleAddTime = useCallback(() => {
    if (notificationTimes.length >= MAX_NOTIFICATION_TIMES) return;
    if (notificationTimes.includes(newTime)) return;

    const updated = [...notificationTimes, newTime].sort();
    updateSettings.mutate({ notification_times: updated });
  }, [newTime, notificationTimes, updateSettings]);

  const handleRemoveTime = useCallback(
    (time: string) => {
      const updated = notificationTimes.filter((t) => t !== time);
      updateSettings.mutate({
        notification_times: updated.length > 0 ? updated : ['08:00'],
      });
    },
    [notificationTimes, updateSettings],
  );

  const handleTimeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewTime(event.target.value);
    },
    [],
  );

  const showPermissionWarning =
    pushStatus?.isSupported && pushStatus.permission === 'denied';
  const showUnsupported = pushStatus && !pushStatus.isSupported;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{_(msg`Notifications`)}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Push Notification Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>
                {_(msg`Push Notifications`)}
              </Text>
              <Text style={styles.toggleDescription}>
                {_(msg`Get reminded about incomplete habits`)}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#d1d5db', true: '#818cf8' }}
              thumbColor={notificationsEnabled ? '#6366f1' : '#f4f4f5'}
              disabled={showPermissionWarning || showUnsupported}
            />
          </View>

          {showPermissionWarning && (
            <View style={styles.warning}>
              <Ionicons name="warning-outline" size={16} color="#f59e0b" />
              <Text style={styles.warningText}>
                {_(msg`Notifications are blocked. Please enable them in your browser settings.`)}
              </Text>
            </View>
          )}

          {showUnsupported && (
            <View style={styles.warning}>
              <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
              <Text style={styles.warningText}>
                {_(msg`Push notifications are not supported in this browser.`)}
              </Text>
            </View>
          )}
        </View>

        {/* Notification Times */}
        {notificationsEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {_(msg`Notification Times`)}
            </Text>

            <View style={styles.timeList}>
              {notificationTimes.map((time) => (
                <View key={time} style={styles.timeRow}>
                  <Ionicons name="time-outline" size={20} color="#6b7280" />
                  <Text style={styles.timeText}>{time.slice(0, 5)}</Text>
                  <Pressable
                    onPress={() => handleRemoveTime(time)}
                    style={styles.removeButton}
                    testID={`remove-time-${time}`}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </View>

            {notificationTimes.length < MAX_NOTIFICATION_TIMES && (
              <View style={styles.addTimeRow}>
                {Platform.OS === 'web' ? (
                  <input
                    type="time"
                    value={newTime}
                    onChange={handleTimeChange as unknown as undefined}
                    style={{
                      fontSize: 16,
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      flex: 1,
                    }}
                    data-testid="time-input"
                  />
                ) : (
                  <Text style={styles.timeText}>{newTime}</Text>
                )}
                <Pressable
                  onPress={handleAddTime}
                  style={styles.addButton}
                  testID="add-time-button"
                >
                  <Ionicons name="add-circle" size={22} color="#6366f1" />
                  <Text style={styles.addButtonText}>
                    {_(msg`Add`)}
                  </Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.hint}>
              {_(msg`You can set up to 5 notification times.`)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  timeList: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  removeButton: {
    padding: 4,
  },
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
});
