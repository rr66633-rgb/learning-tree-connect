import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuthStore } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
import { childrenService, attendanceService, notificationsService } from '../../services/api';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { t, isRTL } = useI18n();
  const [stats, setStats] = useState({ totalChildren: 0, presentToday: 0, absentToday: 0, unreadNotifications: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [children, notifications] = await Promise.all([
        childrenService.getAll().catch(() => []),
        notificationsService.getUnreadCount().catch(() => ({ count: 0 })),
      ]);
      setStats({ totalChildren: children.length || 0, presentToday: 0, absentToday: 0, unreadNotifications: notifications.count || 0 });
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const quickActions = [
    { label: t.attendance, icon: '✓', color: '#059669', screen: 'Attendance' },
    { label: t.dailyReports, icon: '📋', color: '#2563eb', screen: 'DailyReports' },
    { label: t.children, icon: '👶', color: '#7c3aed', screen: 'Children' },
    { label: t.messages, icon: '💬', color: '#d97706', screen: 'Messages' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}>
      <View style={styles.header}>
        <Text style={[styles.greeting, isRTL && styles.rtlText]}>{t.welcome}، {isRTL ? user?.firstNameAr || user?.firstName : user?.firstName}</Text>
        <Text style={[styles.date, isRTL && styles.rtlText]}>{new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}><Text style={styles.statValue}>{stats.totalChildren}</Text><Text style={styles.statLabel}>{t.children}</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}><Text style={styles.statValue}>{stats.presentToday}</Text><Text style={styles.statLabel}>{t.present}</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}><Text style={styles.statValue}>{stats.absentToday}</Text><Text style={styles.statLabel}>{t.absent}</Text></View>
        <View style={[styles.statCard, { backgroundColor: '#fefce8' }]}><Text style={styles.statValue}>{stats.unreadNotifications}</Text><Text style={styles.statLabel}>{t.notifications}</Text></View>
      </View>
      <View style={styles.actionsContainer}>
        {quickActions.map((action, i) => (
          <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(action.screen)}>
            <View style={[styles.actionIcon, { backgroundColor: action.color }]}><Text style={styles.actionIconText}>{action.icon}</Text></View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  date: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  rtlText: { textAlign: 'right' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  actionsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12, marginTop: 16 },
  actionCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIconText: { fontSize: 20 },
  actionLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
});
