import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { dailyReportsService } from '../../services/api';

export default function DailyReportsScreen({ navigation }: any) {
  const { t, isRTL } = useI18n();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => { try { const data = await dailyReportsService.getAll(); setReports(data || []); } catch {} finally { setLoading(false); } };
  useEffect(() => { loadReports(); }, []);

  const getMoodEmoji = (mood: string) => {
    switch (mood) { case 'HAPPY': return '😊'; case 'CALM': return '😌'; case 'TIRED': return '😴'; case 'UPSET': return '😢'; default: return '😊'; }
  };

  const renderReport = ({ item }: any) => (
    <TouchableOpacity style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.childName}>{item.child?.firstName} {item.child?.lastName}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.reportBody}>
        <View style={styles.reportItem}><Text style={styles.emoji}>{getMoodEmoji(item.mood)}</Text><Text style={styles.itemLabel}>{t.mood}</Text></View>
        {item.meals && <View style={styles.reportItem}><Text style={styles.emoji}>🍽️</Text><Text style={styles.itemText}>{item.meals}</Text></View>}
        {item.activities && <View style={styles.reportItem}><Text style={styles.emoji}>🎨</Text><Text style={styles.itemText}>{item.activities?.substring(0, 40)}</Text></View>}
      </View>
      <View style={[styles.statusBadge, item.isPublished ? styles.published : styles.draft]}>
        <Text style={[styles.statusText, item.isPublished ? styles.publishedText : styles.draftText]}>{item.isPublished ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList data={reports} renderItem={renderReport} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReports} tintColor="#059669" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{t.noData}</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16 },
  reportCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  childName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#6b7280' },
  reportBody: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  reportItem: { alignItems: 'center' },
  emoji: { fontSize: 20, marginBottom: 2 },
  itemLabel: { fontSize: 11, color: '#6b7280' },
  itemText: { fontSize: 11, color: '#374151', maxWidth: 80 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  published: { backgroundColor: '#ecfdf5' },
  draft: { backgroundColor: '#fefce8' },
  statusText: { fontSize: 11, fontWeight: '500' },
  publishedText: { color: '#059669' },
  draftText: { color: '#d97706' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
});
