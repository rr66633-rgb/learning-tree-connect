import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, Search, Archive, ArchiveRestore, Trash2, MessageCircle,
  User, FileText, Check, CheckCheck, Paperclip, Shield
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiUrl } from "@/lib/apiBase";
import { useTranslation } from "react-i18next";

export default function Messages() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "owner" || user?.role === "principal";

  // Admin uses allConversations, others use regular conversations
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const { data: adminConversations, isLoading: loadingAdmin } = trpc.messages.allConversations.useQuery(
    { search: searchQuery || undefined },
    { enabled: isAdmin, refetchInterval: 10000 }
  );
  const { data: userConversations, isLoading: loadingUser } = trpc.messages.conversations.useQuery(
    undefined,
    { enabled: !isAdmin, refetchInterval: 10000 }
  );

  const conversations = isAdmin ? adminConversations : userConversations;
  const isLoading = isAdmin ? loadingAdmin : loadingUser;

  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const { data: messages, isLoading: loadingMsgs } = trpc.messages.list.useQuery(
    { conversationId: selectedConv! },
    { enabled: !!selectedConv, refetchInterval: 5000 }
  );
  const sendMsg = trpc.messages.send.useMutation();
  const archiveConv = trpc.messages.archive.useMutation();
  const unarchiveConv = trpc.messages.unarchive.useMutation();
  const deleteMsg = trpc.messages.deleteMessage.useMutation();
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (activeTab === "active") {
      return (conversations as any[]).filter((c: any) => !c.isArchived);
    } else {
      return (conversations as any[]).filter((c: any) => c.isArchived);
    }
  }, [conversations, activeTab]);

  const handleSend = () => {
    if (!text.trim() || !selectedConv) return;
    sendMsg.mutate(
      { conversationId: selectedConv, content: text },
      {
        onSuccess: () => {
          setText("");
          utils.messages.list.invalidate();
          if (isAdmin) utils.messages.allConversations.invalidate();
          else utils.messages.conversations.invalidate();
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
            if (isAdmin) utils.messages.allConversations.invalidate();
            else utils.messages.conversations.invalidate();
          },
        }
      );
    } catch {
      toast.error(isAr ? "فشل رفع الملف" : "Failed to upload file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleArchive = (convId: number) => {
    archiveConv.mutate(
      { conversationId: convId },
      {
        onSuccess: () => {
          toast.success(isAr ? "تم أرشفة المحادثة" : "Conversation archived");
          utils.messages.allConversations.invalidate();
          if (selectedConv === convId) setSelectedConv(null);
        },
      }
    );
  };

  const handleUnarchive = (convId: number) => {
    unarchiveConv.mutate(
      { conversationId: convId },
      {
        onSuccess: () => {
          toast.success(isAr ? "تم إلغاء الأرشفة" : "Unarchived");
          utils.messages.allConversations.invalidate();
        },
      }
    );
  };

  const handleDeleteMessage = (msgId: number) => {
    deleteMsg.mutate(
      { messageId: msgId },
      {
        onSuccess: () => {
          toast.success(isAr ? "تم حذف الرسالة" : "Message deleted");
          utils.messages.list.invalidate();
        },
      }
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "parent": return "ولي أمر";
      case "teacher": return "معلم/ة";
      case "assistant": return "مساعد/ة";
      case "admin": return "إدارة";
      case "principal": return "مدير/ة";
      default: return role;
    }
  };

  const getConversationName = (conv: any) => {
    if (isAdmin) {
      return `${conv.participantOneName || "مستخدم"} ↔ ${conv.participantTwoName || "مستخدم"}`;
    }
    return conv.otherUserName || "مستخدم";
  };

  const selectedConversation = conversations?.find((c: any) => c.id === selectedConv);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {isAdmin && <Shield className="h-5 w-5" />}
          <MessageCircle className="h-6 w-6" />
          {isAdmin ? "إدارة الرسائل" : "الرسائل"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Conversation List */}
        <Card className="flex flex-col min-h-0">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الطفل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pr-9"
              />
            </div>
            {isAdmin && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-8">
                  <TabsTrigger value="active" className="text-xs">النشطة</TabsTrigger>
                  <TabsTrigger value="archived" className="text-xs">المؤرشفة</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <CardContent className="p-2 overflow-y-auto flex-1">
            {isLoading ? (
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
                <p className="text-sm text-muted-foreground">
                  {activeTab === "archived" ? "لا توجد محادثات مؤرشفة" : "لا توجد محادثات"}
                </p>
              </div>
            ) : (
              filteredConversations.map((c: any) => (
                <div
                  key={c.id}
                  className={`w-full text-right p-3 rounded-lg transition-all duration-150 mb-1 cursor-pointer ${
                    selectedConv === c.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedConv(c.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="font-medium text-sm truncate">{getConversationName(c)}</p>
                        {(c as any).unreadCount > 0 && (
                          <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">
                            {(c as any).unreadCount}
                          </Badge>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                            {getRoleBadge(c.participantOneRole)}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">↔</span>
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                            {getRoleBadge(c.participantTwoRole)}
                          </Badge>
                        </div>
                      )}
                      {c.childName && (
                        <p className="text-[11px] text-primary/70 mt-0.5">بخصوص: {c.childName}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {c.lastMessagePreview || "بدء محادثة"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) : ""}
                      </span>
                      {isAdmin && (
                        <div className="flex gap-0.5">
                          {c.isArchived ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => { e.stopPropagation(); handleUnarchive(c.id); }}
                            >
                              <ArchiveRestore className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => { e.stopPropagation(); handleArchive(c.id); }}
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="md:col-span-2 flex flex-col min-h-0">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{getConversationName(selectedConversation)}</p>
                    {(selectedConversation as any)?.childName && (
                      <p className="text-xs text-muted-foreground">بخصوص: {(selectedConversation as any).childName}</p>
                    )}
                  </div>
                </div>
                {isAdmin && selectedConversation && !selectedConversation.isArchived && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => handleArchive(selectedConv)}
                  >
                    <Archive className="h-3 w-3" />
                    أرشفة
                  </Button>
                )}
              </div>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    لا توجد رسائل بعد
                  </div>
                ) : (
                  messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-start" : "justify-end"} group`}
                    >
                      <div className="relative">
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                            msg.senderId === user?.id
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className="text-[11px] font-medium opacity-80 mb-1">
                            {msg.senderName}
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 mr-1 opacity-70">
                              {getRoleBadge(msg.senderRole)}
                            </Badge>
                          </p>
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
                                {msg.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Admin delete button */}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الرسالة</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذه الرسالة؟ لن يتمكن المستخدمون من رؤيتها بعد الحذف.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)} className="bg-destructive text-destructive-foreground">
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </CardContent>

              {/* Input - Admin can also reply */}
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
                <p className="text-muted-foreground">
                  {isAdmin ? "اختر محادثة لعرضها والإشراف عليها" : "اختر محادثة للبدء"}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
