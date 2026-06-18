import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { notificationsService } from '../../services/api';

export default function NotificationsScreen() {
  const { t, isRTL } = useI18n();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => { try { const data = await notificationsService.getAll(); setNotifications(data || []); } catch {} finally { setLoading(false); } };
  useEffect(() => { loadNotifications(); }, []);

  const markRead = async (id: string) => { try { await notificationsService.markRead(id); loadNotifications(); } catch {} };

  const getIcon = (type: string) => { switch (type) { case 'ATTENDANCE': return '✓'; case 'MESSAGE': return '💬'; case 'REPORT': return '📋'; case 'PAYMENT': return '💰'; default: return '🔔'; } };

  return (
    <View style={styles.container}>
      <FlatList data={notifications} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.notifCard, !item.isRead && styles.unread]} onPress={() => markRead(item.id)}>
          <View style={styles.iconCircle}><Text style={styles.icon}>{getIcon(item.type)}</Text></View>
          <View style={styles.notifContent}>
            <Text style={[styles.notifTitle, isRTL && styles.rtlText]}>{item.title}</Text>
            <Text style={[styles.notifBody, isRTL && styles.rtlText]}>{item.body}</Text>
            <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
          {!item.isRead && <View style={styles.dot} />}
        </TouchableOpacity>
      )} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor="#059669" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{t.noData}</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16 },
  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  unread: { backgroundColor: '#f0fdf4' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 18 },
  notifContent: { flex: 1, marginHorizontal: 12 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notifBody: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  notifTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  rtlText: { textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
});
