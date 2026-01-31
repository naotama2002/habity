import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/locale/i18n';

export default function SettingsScreen() {
  const { _ } = useLingui();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const currentLanguage = i18n.locale === 'ja' ? _(msg`Japanese`) : _(msg`English`);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#6b7280" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{_(msg`Guest User`)}</Text>
            <Text style={styles.userEmail}>{_(msg`Please sign in`)}</Text>
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{_(msg`General`)}</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="color-palette-outline"
              label={_(msg`Appearance`)}
              value={_(msg`System`)}
            />
            <MenuItem icon="notifications-outline" label={_(msg`Notifications`)} />
            <MenuItem icon="language-outline" label={_(msg`Language`)} value={currentLanguage} />
            <MenuItem icon="calendar-outline" label={_(msg`Week Starts On`)} value={_(msg`Monday`)} />
          </View>
        </View>

        {/* Data Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{_(msg`Data`)}</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="folder-outline" label={_(msg`Manage Categories`)} />
            <Pressable onPress={() => Alert.alert(_(msg`Not Implemented`), _(msg`This feature is coming soon`))}>
              <MenuItem icon="download-outline" label={_(msg`Import from Habitify`)} />
            </Pressable>
            <MenuItem icon="share-outline" label={_(msg`Export Data`)} />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{_(msg`Support`)}</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="help-circle-outline" label={_(msg`Help`)} />
            <MenuItem icon="chatbubble-outline" label={_(msg`Feedback`)} />
            <MenuItem
              icon="information-circle-outline"
              label={_(msg`About This App`)}
            />
          </View>
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>{_(msg`Sign Out`)}</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.version}>Habity v0.1.0</Text>
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.menuItem}>
      <Ionicons name={icon} size={22} color="#6b7280" />
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
      </View>
    </View>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuValue: {
    fontSize: 14,
    color: '#9ca3af',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 24,
    marginBottom: 32,
  },
});
