import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { childrenService } from '../../services/api';

export default function ChildrenScreen({ navigation }: any) {
  const { t, isRTL } = useI18n();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = async () => { try { const data = await childrenService.getAll(); setChildren(data); } catch {} finally { setLoading(false); } };
  useEffect(() => { loadChildren(); }, []);

  const renderChild = ({ item }: any) => (
    <TouchableOpacity style={styles.childCard} onPress={() => navigation.navigate('ChildDetail', { child: item })}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(isRTL ? item.firstNameAr : item.firstName)?.[0]}</Text></View>
      <View style={styles.childInfo}>
        <Text style={[styles.childName, isRTL && styles.rtlText]}>{isRTL ? `${item.firstNameAr || item.firstName} ${item.lastNameAr || item.lastName}` : `${item.firstName} ${item.lastName}`}</Text>
        <Text style={[styles.childMeta, isRTL && styles.rtlText]}>{item.class?.name || ''} | {item.gender === 'MALE' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female')}</Text>
      </View>
      <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge]}>
        <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.activeText : styles.inactiveText]}>{item.status === 'ACTIVE' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList data={children} renderItem={renderChild} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadChildren} tintColor="#059669" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{t.noData}</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16 },
  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#059669' },
  childInfo: { flex: 1, marginHorizontal: 12 },
  childName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  childMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rtlText: { textAlign: 'right' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#ecfdf5' },
  inactiveBadge: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '500' },
  activeText: { color: '#059669' },
  inactiveText: { color: '#6b7280' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
});
