import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Plus, Paperclip, Check, CheckCheck, MessageCircle, User, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";

export default function StaffMessages() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
    const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "principal" || user?.role === "owner";
  const { data: adminConvs, isLoading: loadingAdminConvs } = trpc.messages.allConversations.useQuery(
    { search: undefined },
    { enabled: isAdmin, refetchInterval: 10000 }
  );
  const { data: userConvs, isLoading: loadingUserConvs } = trpc.messages.conversations.useQuery(
    undefined,
    { enabled: !isAdmin, refetchInterval: 10000 }
  );
  // Normalize admin conversations to match the shape expected by the UI
  const conversations = useMemo(() => {
    if (isAdmin && adminConvs) {
      return adminConvs.map((c: any) => ({
        ...c,
        otherUserName: c.participantOneName + " ↔ " + c.participantTwoName,
        otherUserRole: c.participantOneRole,
        otherUserId: c.participantOneId,
        unreadCount: 0,
      }));
    }
    return userConvs || [];
  }, [isAdmin, adminConvs, userConvs]);
  const loadingConvs = isAdmin ? loadingAdminConvs : loadingUserConvs;
  const { data: contacts } = trpc.messages.getContacts.useQuery();
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
  const [selectedParent, setSelectedParent] = useState<string>("");
  const [selectedChildForConv, setSelectedChildForConv] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Get children for selected parent
  const selectedParentData = useMemo(() => {
    if (!contacts || !selectedParent) return null;
    return (contacts as any[]).find((c: any) => c.id === parseInt(selectedParent));
  }, [contacts, selectedParent]);

  const handleSend = () => {
    if (!text.trim() || !selectedConv) return;
    sendMsg.mutate(
      { conversationId: selectedConv, content: text },
      {
        onSuccess: () => {
          setText("");
          utils.messages.list.invalidate();
          utils.messages.conversations.invalidate();
        },
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(apiUrl('/api/upload-document'), { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("فشل الرفع");
      const data = await res.json();
      const attachmentType = file.type.startsWith("image/") ? "image" : "document";
      sendMsg.mutate(
        {
          conversationId: selectedConv,
          content: `📎 ${file.name}`,
          attachmentUrl: data.url,
          attachmentType,
          attachmentName: file.name,
        },
        {
          onSuccess: () => {
            utils.messages.list.invalidate();
            utils.messages.conversations.invalidate();
          },
        }
      );
    } catch {
      toast.error(isAr ? "فشل رفع الملف" : "Failed to upload file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateConversation = () => {
    if (!selectedParent) {
      toast.error(isAr ? "يرجى اختيار ولي الأمر" : "Please select a parent");
      return;
    }
    const childId = selectedChildForConv ? parseInt(selectedChildForConv) : undefined;
    createConv.mutate(
      { participantId: parseInt(selectedParent), childId },
      {
        onSuccess: (conv: any) => {
          setShowNewConv(false);
          setSelectedParent("");
          setSelectedChildForConv("");
          utils.messages.conversations.invalidate();
          setSelectedConv(conv.id);
        },
      }
    );
  };

  const selectedConversation = conversations?.find((c: any) => c.id === selectedConv);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "parent": return "ولي أمر";
      case "teacher": return "معلم/ة";
      case "assistant": return "مساعد/ة";
      case "admin": return "إدارة";
      default: return role;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-purple-600" />
            </div>
            الرسائل
          </h1>
        </div>
        <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              محادثة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>محادثة جديدة مع ولي أمر</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">اختر ولي الأمر</label>
                <Select value={selectedParent} onValueChange={(v) => { setSelectedParent(v); setSelectedChildForConv(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر ولي الأمر" />
                  </SelectTrigger>
                  <SelectContent>
                    {(contacts as any[])?.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {contact.name}
                          {contact.children && (
                            <span className="text-xs text-muted-foreground">
                              ({contact.children.map((c: any) => c.name).join("، ")})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedParentData?.children && selectedParentData.children.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block">بخصوص الطفل (اختياري)</label>
                  <Select value={selectedChildForConv} onValueChange={setSelectedChildForConv}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطفل" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedParentData.children.map((child: any) => (
                        <SelectItem key={child.id} value={child.id.toString()}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleCreateConversation} disabled={!selectedParent} className="w-full">
                بدء المحادثة
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
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <CardContent className="p-2 overflow-y-auto flex-1">
            {loadingConvs ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد محادثات</p>
                <p className="text-xs text-muted-foreground mt-1">ابدأ محادثة مع ولي أمر</p>
              </div>
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
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {getRoleBadge(c.otherUserRole)}
                        </Badge>
                        {c.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5">
                            {c.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {c.childName && (
                        <p className="text-[11px] text-primary/70 mt-0.5">بخصوص: {c.childName}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {c.lastMessagePreview || "بدء محادثة"}
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{selectedConversation?.otherUserName}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {getRoleBadge(selectedConversation?.otherUserRole || "")}
                    </Badge>
                  </div>
                  {selectedConversation?.childName && (
                    <p className="text-xs text-muted-foreground">بخصوص: {selectedConversation.childName}</p>
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
                    لا توجد رسائل بعد. ابدأ المحادثة!
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
                                alt={msg.attachmentName || "صورة"}
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
                                <span className="text-xs truncate">{msg.attachmentName || "ملف مرفق"}</span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                  placeholder="اكتب رسالتك..."
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
                <p className="text-muted-foreground">اختر محادثة أو ابدأ محادثة جديدة</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
