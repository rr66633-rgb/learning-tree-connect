import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useAuthStore } from '../../hooks/useAuth';
import { messagingService } from '../../services/api';

export default function MessagesScreen() {
  const { t, isRTL } = useI18n();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConversations(); }, []);
  const loadConversations = async () => { try { const data = await messagingService.getConversations(); setConversations(data || []); } catch {} finally { setLoading(false); } };

  const openChat = async (partner: any) => {
    setSelectedUser(partner);
    try { const data = await messagingService.getMessages(partner.id); setMessages(data || []); } catch { setMessages([]); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    try {
      await messagingService.sendMessage({ receiverId: selectedUser.id, content: newMessage, type: 'TEXT' });
      setNewMessage('');
      const data = await messagingService.getMessages(selectedUser.id);
      setMessages(data || []);
    } catch {}
  };

  if (selectedUser) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedUser(null)}><Text style={styles.backText}>← {selectedUser.firstName}</Text></TouchableOpacity>
        <FlatList data={messages} inverted renderItem={({ item }) => (
          <View style={[styles.msgBubble, item.senderId === user?.id ? styles.myMsg : styles.theirMsg]}>
            <Text style={[styles.msgText, item.senderId === user?.id && styles.myMsgText]}>{item.content}</Text>
            <Text style={[styles.msgTime, item.senderId === user?.id && styles.myMsgTime]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )} keyExtractor={(_, i) => i.toString()} contentContainerStyle={styles.msgList} />
        <View style={styles.inputRow}>
          <TextInput style={[styles.msgInput, isRTL && { textAlign: 'right' }]} value={newMessage} onChangeText={setNewMessage} placeholder={isRTL ? 'اكتب رسالة...' : 'Type message...'} />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}><Text style={styles.sendText}>{t.send}</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList data={conversations} renderItem={({ item }) => (
        <TouchableOpacity style={styles.convCard} onPress={() => openChat(item)}>
          <View style={styles.convAvatar}><Text style={styles.convAvatarText}>{item.firstName?.[0]}</Text></View>
          <View style={styles.convInfo}><Text style={styles.convName}>{item.firstName} {item.lastName}</Text><Text style={styles.convLast}>{item.lastMessage || ''}</Text></View>
        </TouchableOpacity>
      )} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>{t.noData}</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16 },
  convCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  convAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
  convAvatarText: { fontSize: 18, fontWeight: '600', color: '#059669' },
  convInfo: { flex: 1, marginStart: 12 },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  convLast: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  backBtn: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backText: { fontSize: 16, fontWeight: '500', color: '#059669' },
  msgList: { padding: 16 },
  msgBubble: { maxWidth: '75%', borderRadius: 16, padding: 12, marginBottom: 8 },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#059669', borderBottomRightRadius: 4 },
  theirMsg: { alignSelf: 'flex-start', backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#111827' },
  myMsgText: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  myMsgTime: { color: '#d1fae5' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  msgInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: '#059669', borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center', marginStart: 8 },
  sendText: { color: '#fff', fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
});
