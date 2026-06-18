import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';

export default function ProfileScreen() {
  const { user, logout, language, setLanguage } = useAuthStore();
  const { t, isRTL } = useI18n();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text></View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.settings}</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.menuLabel}>{isRTL ? 'اللغة' : 'Language'}</Text>
          <Text style={styles.menuValue}>{language === 'ar' ? 'العربية' : 'English'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}><Text style={styles.logoutText}>{t.logout}</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  profileHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 30, backgroundColor: '#fff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  rtlText: { textAlign: 'right' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  menuLabel: { fontSize: 15, color: '#374151' },
  menuValue: { fontSize: 14, color: '#6b7280' },
  logoutBtn: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
});
