import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#6b7280" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>ゲストユーザー</Text>
            <Text style={styles.userEmail}>ログインしてください</Text>
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>一般</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="color-palette-outline"
              label="外観"
              value="システム"
            />
            <MenuItem icon="notifications-outline" label="通知" />
            <MenuItem icon="language-outline" label="言語" value="日本語" />
            <MenuItem icon="calendar-outline" label="週の開始日" value="月曜" />
          </View>
        </View>

        {/* Data Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="folder-outline" label="カテゴリ管理" />
            <Pressable onPress={() => Alert.alert('未実装', 'この機能は準備中です')}>
              <MenuItem icon="download-outline" label="Habitify からインポート" />
            </Pressable>
            <MenuItem icon="share-outline" label="データエクスポート" />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サポート</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="help-circle-outline" label="ヘルプ" />
            <MenuItem icon="chatbubble-outline" label="フィードバック" />
            <MenuItem
              icon="information-circle-outline"
              label="このアプリについて"
            />
          </View>
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>ログアウト</Text>
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
