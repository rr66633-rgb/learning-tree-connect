import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Plus, Paperclip, Check, CheckCheck, MessageCircle, User, FileText, Image as ImageIcon, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { toast } from "sonner";
import { trackContact } from "@/lib/metaPixel";
import { apiUrl } from "@/lib/apiBase";
import { fetchWithCsrf } from "@/lib/csrf";
import { uploadWithProgress, compressImage } from "@/lib/uploadWithProgress";
import { useTranslation } from "react-i18next";

export default function ParentMessages() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { user } = useAuth();
  const { data: conversations, isLoading: loadingConvs } = trpc.messages.conversations.useQuery(undefined, { refetchInterval: 10000 });
  const { data: children } = trpc.children.list.useQuery();
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const { data: messages, isLoading: loadingMsgs } = trpc.messages.list.useQuery(
    { conversationId: selectedConv! },
    { enabled: !!selectedConv, refetchInterval: 5000 }
  );
  const sendMsg = trpc.messages.send.useMutation();
  const createConv = trpc.messages.createConversation.useMutation();
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contacts } = trpc.messages.getContacts.useQuery(
    { childId: selectedChild ? parseInt(selectedChild) : undefined },
    { enabled: !!selectedChild }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c: any) =>
      c.otherUserName?.toLowerCase().includes(q) ||
      c.childName?.toLowerCase().includes(q) ||
      c.lastMessagePreview?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleSend = () => {
    if (!text.trim() || !selectedConv) return;
    sendMsg.mutate(
      { conversationId: selectedConv, content: text },
      {
        onSuccess: () => {
          setText("");
          trackContact();
          utils.messages.list.invalidate();
          utils.messages.conversations.invalidate();
        } }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const data = await uploadWithProgress(apiUrl('/api/upload-document'), formData);
      const attachmentType = file.type.startsWith("image/") ? "image" : "document";
      sendMsg.mutate(
        {
          conversationId: selectedConv,
          content: `📎 ${file.name}`,
          attachmentUrl: data.url,
          attachmentType,
          attachmentName: file.name },
        {
          onSuccess: () => {
            utils.messages.list.invalidate();
            utils.messages.conversations.invalidate();
          } }
      );
    } catch {
      toast.error(isAr ? "فشل رفع الملف" : "Failed to upload file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateConversation = () => {
    if (!selectedTeacher || !selectedChild) {
      toast.error(isAr ? "يرجى اختيار الطفل والمعلم" : "Please select child and teacher");
      return;
    }
    createConv.mutate(
      { participantId: parseInt(selectedTeacher), childId: parseInt(selectedChild) },
      {
        onSuccess: (conv: any) => {
          setShowNewConv(false);
          setSelectedChild("");
          setSelectedTeacher("");
          utils.messages.conversations.invalidate();
          setSelectedConv(conv.id);
        } }
    );
  };

  const selectedConversation = conversations?.find((c: any) => c.id === selectedConv);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          {isAr ? "الرسائل" : "Messages"}
        </h1>
        <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {isAr ? "محادثة جديدة" : "New Chat"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? "محادثة جديدة" : "New Chat"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "اختر الطفل" : "Select Child"}</label>
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} />
                  </SelectTrigger>
                  <SelectContent>
                    {children?.map((child: any) => (
                      <SelectItem key={child.id} value={child.id.toString()}>
                        {child.firstName} {child.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isAr ? "اختر المعلم/ة" : "Select Teacher"}</label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر المعلم/ة" : "Select Teacher"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts?.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.name}
                        <span className="text-muted-foreground mr-2 text-xs">
                          ({contact.role === 'teacher' ? 'معلم/ة' : contact.role === 'assistant' ? 'مساعد/ة' : isAr ? 'إدارة' : 'Management'})
                        </span>
                      </SelectItem>
                    ))}
                    {selectedChild && (!contacts || contacts.length === 0) && (
                      <div className="p-2 text-sm text-muted-foreground text-center">{isAr ? "لا يوجد معلمون مسجلون لهذا الفصل" : "No teachers registered for this class"}</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateConversation} disabled={!selectedChild || !selectedTeacher} className="w-full">
                {isAr ? "بدء المحادثة" : "Start Chat"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Conversation List */}
        <Card className="flex flex-col min-h-0">
          <div className="p-3 border-b">
            <Input
              placeholder={isAr ? "بحث في المحادثات..." : "Search in Chats..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <CardContent className="p-2 overflow-y-auto flex-1">
            {loadingConvs ? (
              <PageSkeleton variant="list" title={false} count={4} />
            ) : filteredConversations.length === 0 ? (
              <EmptyState variant="messages" compact />
            ) : (
              filteredConversations.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConv(c.id)}
                  className={`w-full text-right p-3 rounded-lg transition-all duration-150 mb-1 ${
                    selectedConv === c.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{c.otherUserName}</p>
                        {c.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5">
                            {c.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {c.childName && (
                        <p className="text-[11px] text-primary/70 mt-0.5">{c.childName}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {c.lastMessagePreview || isAr ? "بدء محادثة" : "Start Chat"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="md:col-span-2 flex flex-col min-h-0">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 border-b flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedConversation?.otherUserName}</p>
                  {selectedConversation?.childName && (
                    <p className="text-xs text-muted-foreground">{isAr ? "بخصوص:" : "Regarding:"} {selectedConversation.childName}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {isAr ? "لا توجد رسائل بعد. ابدأ المحادثة!" : "No messages yet. Start the conversation!"}
                  </div>
                ) : (
                  messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        {msg.senderId !== user?.id && (
                          <p className="text-[11px] font-medium opacity-80 mb-1">{msg.senderName}</p>
                        )}
                        {msg.attachmentUrl && (
                          <div className="mb-2">
                            {msg.attachmentType === "image" ? (
                              <img
                                src={msg.attachmentUrl}
                                alt={msg.attachmentName || (isAr ? "صورة" : "Photo")}
                                className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                                onClick={() => window.open(msg.attachmentUrl, "_blank")}
                              />
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-xs truncate">{msg.attachmentName || isAr ? "ملف مرفق" : "Attached File"}</span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit" })}
                          </span>
                          {msg.senderId === user?.id && (
                            <span className="opacity-60">
                              {msg.isRead ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </CardContent>

              {/* Input */}
              <div className="p-3 border-t flex gap-2 items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isAr ? "اكتب رسالتك..." : "Type your message..."}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!text.trim() || sendMsg.isPending}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">{isAr ? "اختر محادثة أو ابدأ محادثة جديدة" : "Choose a conversation or start a new one"}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
