import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { childrenService, attendanceService } from '../../services/api';

export default function AttendanceScreen() {
  const { t, isRTL } = useI18n();
  const [children, setChildren] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      const [c, a] = await Promise.all([childrenService.getAll(), attendanceService.getByDate(today)]);
      setChildren(c || []); setAttendance(a || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  const handleCheckIn = async (childId: string) => {
    try { await attendanceService.checkIn(childId); loadData(); } catch (e: any) { Alert.alert('Error', e.message); }
  };
  const handleCheckOut = async (childId: string) => {
    try { await attendanceService.checkOut(childId); loadData(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const getAtt = (childId: string) => attendance.find((a: any) => a.childId === childId);
  const presentCount = attendance.filter((a: any) => a.status === 'PRESENT').length;

  const renderChild = ({ item }: any) => {
    const att = getAtt(item.id);
    const isPresent = att?.status === 'PRESENT';
    return (
      <View style={styles.childRow}>
        <View style={[styles.avatar, isPresent && styles.avatarPresent]}><Text style={[styles.avatarText, isPresent && styles.avatarTextPresent]}>{(isRTL ? item.firstNameAr : item.firstName)?.[0]}</Text></View>
        <View style={styles.childInfo}>
          <Text style={[styles.childName, isRTL && styles.rtlText]}>{isRTL ? `${item.firstNameAr || item.firstName}` : item.firstName}</Text>
          {att?.checkInTime && <Text style={styles.timeText}>{t.checkIn}: {new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
        </View>
        {!isPresent ? (
          <TouchableOpacity style={styles.checkInBtn} onPress={() => handleCheckIn(item.id)}><Text style={styles.checkInText}>{t.checkIn}</Text></TouchableOpacity>
        ) : !att?.checkOutTime ? (
          <TouchableOpacity style={styles.checkOutBtn} onPress={() => handleCheckOut(item.id)}><Text style={styles.checkOutText}>{t.checkOut}</Text></TouchableOpacity>
        ) : (
          <View style={styles.doneBadge}><Text style={styles.doneText}>✓</Text></View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: '#ecfdf5' }]}><Text style={styles.statNum}>{presentCount}</Text><Text style={styles.statLabel}>{t.present}</Text></View>
        <View style={[styles.stat, { backgroundColor: '#fef2f2' }]}><Text style={styles.statNum}>{children.length - presentCount}</Text><Text style={styles.statLabel}>{t.absent}</Text></View>
      </View>
      <FlatList data={children} renderItem={renderChild} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#059669" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{t.noData}</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  stat: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  list: { paddingHorizontal: 16 },
  childRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  avatarPresent: { backgroundColor: '#ecfdf5' },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  avatarTextPresent: { color: '#059669' },
  childInfo: { flex: 1, marginHorizontal: 12 },
  childName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  rtlText: { textAlign: 'right' },
  timeText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  checkInBtn: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  checkInText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  checkOutBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  checkOutText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  doneBadge: { backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  doneText: { color: '#059669', fontSize: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af' },
});
