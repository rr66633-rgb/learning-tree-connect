import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Messages() {
  const { user } = useAuth();
  const { data: conversations, isLoading } = trpc.messages.conversations.useQuery();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const { data: messageList } = trpc.messages.list.useQuery(
    { conversationId: selectedConversation! },
    { enabled: !!selectedConversation, refetchInterval: 5000 }
  );
  const utils = trpc.useUtils();
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate();
      utils.messages.conversations.invalidate();
      setNewMessage("");
    },
    onError: () => toast.error("فشل إرسال الرسالة"),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessage.mutate({ conversationId: selectedConversation, content: newMessage });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الرسائل</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">المحادثات</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)]">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                </div>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors border-b text-right ${selectedConversation === conv.id ? 'bg-muted' : ''}`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">م</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">محادثة #{conv.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(conv.lastMessageAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mb-3" />
                  <p className="text-sm">لا توجد محادثات</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">محادثة #{selectedConversation}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messageList?.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.senderId === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!messageList || messageList.length === 0) && (
                      <p className="text-center text-muted-foreground text-sm py-8">لا توجد رسائل بعد</p>
                    )}
                  </div>
                </ScrollArea>
                <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1" />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessage.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4" />
                <p>اختر محادثة للبدء</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
