import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Send, Sparkles, BookOpen, Star, Brain, Rocket, HelpCircle, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const getQuickActions = (isAr: boolean) => ([
  { id: "memorize", label: (isAr ? "ساعدني في الحفظ" : "Help me save"), icon: BookOpen, color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { id: "test", label: (isAr ? "اختبرني" : "Test Me"), icon: Brain, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { id: "review", label: (isAr ? "مراجعة درس اليوم" : "Review Today's Lesson"), icon: RotateCcw, color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { id: "challenge", label: (isAr ? "تحدي اليوم" : "Today's Challenge"), icon: Star, color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  { id: "question", label: (isAr ? "اسأل سؤالاً" : "Ask a Question"), icon: HelpCircle, color: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100" },
]);

const getQuickActionPrompts = (isAr: boolean): Record<string, string>  => ({
  memorize: (isAr ? "أريد أن أحفظ سورة جديدة. ساعدني في اختيار سورة مناسبة لعمري وأعطني خطة حفظ سهلة." : "I want to memorize a new Surah. Help me choose a suitable Surah for my age and give me an easy memorization plan."),
  test: (isAr ? "اختبرني في ما حفظته من القرآن الكريم. اسألني أسئلة عن السور القصيرة." : "Test me on what I've memorized from the Quran. Ask me questions about short surahs."),
  review: (isAr ? "أريد مراجعة ما حفظته اليوم. ساعدني في التثبيت والمراجعة." : "I want to review what I memorized today. Help me with consolidation and review."),
  challenge: (isAr ? "أعطني تحدي اليوم! سؤال إسلامي ممتع أو تحدي حفظ." : "Give me today's challenge! A fun Islamic question or memorization challenge."),
  question: (isAr ? "عندي سؤال عن الإسلام. أريد أن أتعلم شيئاً جديداً اليوم." : "I have a question about Islam. I want to learn something new today."),
});

export default function AIAssistant() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.ai.childAssistant.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

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
      const conversationHistory = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const result = await chatMutation.mutateAsync({
        message: text.trim(),
        history: conversationHistory,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: (isAr ? "عذراً، حدث خطأ. حاول مرة أخرى! 🌟" : "Sorry, an error occurred. Please try again!"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    const prompt = getQuickActionPrompts(isAr)[actionId];
    if (prompt) {
      sendMessage(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const firstName = user?.name?.split(" ")[0] || (isAr ? "صديقي" : "My friend");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/ai">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{isAr ? "المساعد الذكي" : "AI Assistant"}</h1>
            <p className="text-xs text-muted-foreground">{isAr ? "مساعدك في حفظ القرآن والتعلم" : "Your assistant in memorizing the Quran and learning"}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-gradient-to-b from-slate-50 to-white border border-gray-100 p-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {/* Welcome */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-4 shadow-xl">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isAr ? "مرحباً" : "Welcome"}{firstName}! 🌟
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {isAr ? "أنا مساعدك الذكي لحفظ القرآن الكريم والتعلم عن الإسلام. كيف أقدر أساعدك اليوم؟" : "I am your smart assistant for memorizing the Holy Quran and learning about Islam. How can I help you today?"}
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
              {getQuickActions(isAr).map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] ${action.color}`}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Motivational message */}
            <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-100 max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">{isAr ? "حكمة اليوم" : "Wisdom of the Day"}</span>
              </div>
              <p className="text-xs text-amber-700 italic">
                {isAr ? '"خيركم من تعلم القرآن وعلمه" - رسول الله ﷺ' : '"The best among you are those who learn the Quran and teach it" - Prophet Muhammad ﷺ'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className={`text-[10px] mt-1 ${message.role === "user" ? "text-emerald-200" : "text-gray-400"}`}>
                    {message.timestamp.toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span className="text-sm text-gray-500">{isAr ? "يكتب..." : "Typing..."}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Actions Bar (when in conversation) */}
      {messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 flex-shrink-0">
          {getQuickActions(isAr).map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${action.color} disabled:opacity-50`}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end flex-shrink-0">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAr ? "اكتب رسالتك هنا..." : "Write your message here..."}
            className="resize-none min-h-[44px] max-h-[120px] rounded-xl pr-4 pl-12 py-3 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20"
            rows={1}
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 flex-shrink-0"
          size="icon"
        >
          <Send className="h-5 w-5 text-white" />
        </Button>
      </div>
    </div>
  );
}
