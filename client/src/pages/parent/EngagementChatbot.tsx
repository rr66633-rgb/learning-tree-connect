import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Send, Sparkles, Baby, BookOpen, Brain, Heart, Moon, Utensils } from "lucide-react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  { label: "أنشطة تعليمية", icon: BookOpen, prompt: "ما هي أفضل الأنشطة التعليمية المناسبة لعمر طفلي؟" },
  { label: "تطور اللغة", icon: Brain, prompt: "كيف أساعد طفلي في تطوير مهاراته اللغوية؟" },
  { label: "التغذية السليمة", icon: Utensils, prompt: "ما هي الأطعمة المفيدة لنمو طفلي في هذا العمر؟" },
  { label: "النوم الصحي", icon: Moon, prompt: "كم ساعة نوم يحتاجها طفلي وكيف أنظم روتين نومه؟" },
  { label: "المهارات الاجتماعية", icon: Heart, prompt: "كيف أساعد طفلي على تكوين صداقات والتفاعل مع الآخرين؟" },
  { label: "التطور الحركي", icon: Baby, prompt: "ما هي الأنشطة التي تساعد في تطوير المهارات الحركية لطفلي؟" },
];

export default function EngagementChatbot() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: childrenData, isLoading: childrenLoading } = trpc.children.list.useQuery();
  const chatMutation = trpc.engagement.chatbot.ask.useMutation();

  useEffect(() => {
    if (childrenData?.length && !selectedChildId) {
      setSelectedChildId(String(childrenData[0].id));
    }
  }, [childrenData, selectedChildId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !selectedChildId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({
        question: text.trim(),
        childId: Number(selectedChildId),
        language: "ar",
      });

      const answerText = typeof result.answer === "string" ? result.answer : "";
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answerText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (childrenLoading) {
    return (
      <div className="p-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const selectedChild = childrenData?.find(c => String(c.id) === selectedChildId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/parent/engagement">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            مستشار التربية الذكي
          </h1>
          <p className="text-xs text-muted-foreground">مساعدك في تربية وتنمية طفلك</p>
        </div>
        {childrenData && childrenData.length > 1 && (
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="اختر طفلك" />
            </SelectTrigger>
            <SelectContent>
              {childrenData.map((child) => (
                <SelectItem key={child.id} value={String(child.id)}>
                  {child.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold">مرحباً {user?.name?.split(" ")[0]}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                أنا مستشارك في تربية وتنمية {selectedChild?.firstName || "طفلك"}. اسألني عن أي شيء يتعلق بنمو طفلك وتطوره.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {suggestedQuestions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.prompt)}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-right"
                >
                  <q.icon className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${message.role === "user" ? "text-emerald-200" : "text-muted-foreground"}`}>
                    {message.timestamp.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">يفكر...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا..."
            className="min-h-[44px] max-h-32 resize-none rounded-xl"
            rows={1}
            disabled={isLoading || !selectedChildId}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || !selectedChildId}
            className="shrink-0 rounded-xl h-11 w-11 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
