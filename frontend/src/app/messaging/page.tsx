'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { communicationApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MessagingPage() {
  const { t } = useTranslation();
  const { language, user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConversations(); }, []);
  const loadConversations = async () => { try { const res = await communicationApi.getConversations(); setConversations(res.data); } catch { setConversations([]); } finally { setLoading(false); } };

  const selectConversation = async (partner: any) => {
    setSelectedUser(partner);
    try { const res = await communicationApi.getMessages(partner.id); setMessages(res.data); } catch { setMessages([]); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    try {
      await communicationApi.sendMessage({ receiverId: selectedUser.id, content: newMessage, type: 'TEXT' });
      setNewMessage('');
      const res = await communicationApi.getMessages(selectedUser.id);
      setMessages(res.data);
    } catch (e: any) { toast.error('Error sending message'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.common.messaging}</h1>
        <div className="card p-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-e border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <input type="text" placeholder={t.common.search + '...'} className="input-field text-sm" />
              </div>
              {loading ? <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
              : conversations.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">{t.common.noData}</div>
              : <div className="divide-y divide-gray-50">{conversations.map((conv: any) => (
                  <button key={conv.id} onClick={() => selectConversation(conv)} className={`w-full p-4 text-start hover:bg-gray-50 transition-colors ${selectedUser?.id === conv.id ? 'bg-emerald-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-emerald-700 font-medium text-sm">{conv.firstName?.[0]}</span></div>
                      <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 text-sm truncate">{conv.firstName} {conv.lastName}</p><p className="text-xs text-gray-500 truncate">{conv.lastMessage || ''}</p></div>
                    </div>
                  </button>
                ))}</div>}
            </div>
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {!selectedUser ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{language === 'ar' ? 'اختر محادثة للبدء' : 'Select a conversation'}</p></div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-emerald-700 font-medium text-sm">{selectedUser.firstName?.[0]}</span></div>
                      <p className="font-medium text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg: any, i: number) => (
                      <div key={i} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${msg.senderId === user?.id ? 'bg-emerald-600 text-white rounded-ee-sm' : 'bg-gray-100 text-gray-900 rounded-es-sm'}`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? 'text-emerald-100' : 'text-gray-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'} className="input-field flex-1" />
                      <button type="submit" className="btn-primary px-4"><Send className="w-4 h-4" /></button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
