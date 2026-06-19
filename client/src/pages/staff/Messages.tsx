import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";

export default function StaffMessages() {
  const { user } = useAuth();
  const { data: conversations } = trpc.messages.conversations.useQuery();
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const { data: messages } = trpc.messages.list.useQuery({ conversationId: selectedConv! }, { enabled: !!selectedConv, refetchInterval: 5000 });
  const sendMsg = trpc.messages.send.useMutation();
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !selectedConv) return;
    sendMsg.mutate({ conversationId: selectedConv, content: text }, {
      onSuccess: () => { setText(""); utils.messages.list.invalidate(); },
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الرسائل</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        <Card className="overflow-y-auto">
          <CardContent className="p-2">
            {conversations?.map((c: any) => (
              <button key={c.id} onClick={() => setSelectedConv(c.id)} className={`w-full text-right p-3 rounded-lg transition-colors ${selectedConv === c.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                <p className="font-medium text-sm">{c.otherUserName}</p>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessage || "بدء محادثة"}</p>
              </button>
            ))}
            {(!conversations || conversations.length === 0) && <p className="text-center text-muted-foreground py-8 text-sm">لا توجد محادثات</p>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages?.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg text-sm ${msg.senderId === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.content}
                  <p className="text-[10px] opacity-70 mt-1">{new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </CardContent>
          {selectedConv && (
            <div className="p-3 border-t flex gap-2">
              <Input value={text} onChange={e => setText(e.target.value)} placeholder="اكتب رسالتك..." onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <Button size="icon" onClick={handleSend} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
