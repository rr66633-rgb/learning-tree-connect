import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarCheck2,
  Check,
  Copy,
  LayoutGrid,
  Layers3,
  Loader2,
  LockKeyhole,
  Rocket,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useTranslation } from "react-i18next";

const NUMA_IMAGE = "/assets/numa-assistant.webp";
const MAX_SESSION_MESSAGES = 12;
const MAX_MESSAGE_CHARACTERS = 600;

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse;
};

type StructuredResponse = {
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string | null;
    items: string[];
    style: "bullets" | "steps";
  }>;
  comparison: {
    headers: string[];
    rows: string[][];
  } | null;
  nextStep: {
    label: string;
    href: string;
  } | null;
};

type Suggestion = {
  label: string;
  icon: ElementType;
  color: string;
};

function FallbackAnswer({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words text-[13px] leading-7 text-[#4B566C]">
      {content.split(/\n+/).filter(Boolean).map((rawLine, index) => {
        const line = rawLine.trim();
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        if (heading) return <h4 key={index} className="pt-1 text-sm font-extrabold text-[#1A1F36]">{heading[1]}</h4>;
        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) return <div key={index} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#00A99A]" /><span>{bullet[1]}</span></div>;
        const step = line.match(/^(\d+)[.)]\s+(.+)$/);
        if (step) return <div key={index} className="flex items-start gap-2"><span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1A1F36] text-[10px] font-bold text-white">{step[1]}</span><span>{step[2]}</span></div>;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

const marketingPaths = new Set(["/", "/nurseries", "/pricing"]);

function StructuredAnswer({
  response,
  isAr,
  onNavigate,
}: {
  response: StructuredResponse;
  isAr: boolean;
  onNavigate: () => void;
}) {
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#E9FFFC] text-[#009E91]">
            <Sparkles className="size-3.5" />
          </span>
          <h3 className="text-[15px] font-extrabold leading-6 text-[#172033]">{response.title}</h3>
        </div>
        <p className="text-[13px] leading-7 text-[#4B566C]">{response.summary}</p>
      </div>

      {response.sections.map((section, sectionIndex) => (
        <section key={`${section.heading}-${sectionIndex}`} className="rounded-2xl border border-[#E8ECF2] bg-[#FBFCFE] p-3.5">
          <h4 className="mb-1.5 text-xs font-extrabold text-[#273248]">{section.heading}</h4>
          {section.body && <p className="mb-2.5 text-xs leading-6 text-[#647087]">{section.body}</p>}
          {section.items.length > 0 && (
            <ol className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="flex items-start gap-2.5 text-xs leading-6 text-[#3E4960]">
                  {section.style === "steps" ? (
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1A1F36] text-[10px] font-bold text-white">
                      {itemIndex + 1}
                    </span>
                  ) : (
                    <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#DFFFFA] text-[#008F83]">
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      {response.comparison && (
        <div className="overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[340px] border-collapse text-start text-[11px] leading-5">
              <thead>
                <tr className="bg-gradient-to-r from-[#E9FFFC] to-[#EEF2F4]">
                  {response.comparison.headers.map(header => (
                    <th key={header} className="border-b border-[#DCE7E5] px-3 py-2.5 text-start font-extrabold text-[#263247]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {response.comparison.rows.map((row, rowIndex) => (
                  <tr key={`${row.join("-")}-${rowIndex}`} className="odd:bg-white even:bg-[#FAFBFC]">
                    {response.comparison!.headers.map((_, cellIndex) => (
                      <td key={`${rowIndex}-${cellIndex}`} className="border-b border-[#EEF1F4] px-3 py-2.5 align-top text-[#4C586D] last:border-b-0">
                        {row[cellIndex] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {response.nextStep && (
        <a
          href={response.nextStep.href}
          onClick={onNavigate}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#00B7A7] to-[#009B8E] px-4 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(0,183,167,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,183,167,0.28)]"
        >
          <span>{response.nextStep.label}</span>
          <ArrowIcon className="size-4" />
        </a>
      )}
    </div>
  );
}

export default function VisitorAssistant() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const language = isAr ? "ar" : "en";
  const shouldRender = typeof window !== "undefined" && marketingPaths.has(window.location.pathname);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const nextIdRef = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const settingsQuery = trpc.visitorAssistant.publicSettings.useQuery(undefined, {
    enabled: shouldRender,
    staleTime: 60_000,
    refetchInterval: open ? 60_000 : false,
    retry: 1,
  });
  const chatMutation = trpc.visitorAssistant.chat.useMutation();

  useEffect(() => {
    if (!chatMutation.isPending) {
      setThinkingStage(0);
      return;
    }

    const timers = [
      window.setTimeout(() => setThinkingStage(1), 700),
      window.setTimeout(() => setThinkingStage(2), 1_800),
      window.setTimeout(() => setThinkingStage(3), 3_800),
    ];
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [chatMutation.isPending]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, chatMutation.isPending, open]);

  useEffect(() => {
    if (settingsQuery.data && !settingsQuery.data.enabled) {
      setOpen(false);
    }
  }, [settingsQuery.data]);

  const copy = useMemo(() => ({
    name: isAr ? "نُمى من نشأة" : "Numa from Nashaa",
    role: isAr ? "دليلك الذكي للمنصة" : "Your smart platform guide",
    button: isAr ? "اسأل نُمى" : "Ask Numa",
    welcome: isAr
      ? "أهلاً، أنا نُمى. أرتب لك خدمات نشأة، أوضح الباقات، وأدلك على الخطوة المناسبة داخل الموقع."
      : "Hi, I'm Numa. I can organize Nashaa's services, explain the plans, and guide you to the right place on the website.",
    placeholder: isAr ? "اكتب سؤالك عن نشأة..." : "Ask about Nashaa...",
    send: isAr ? "إرسال الرسالة" : "Send message",
    reset: isAr ? "محادثة جديدة" : "New conversation",
    privacy: isAr
      ? "لا ترسل بيانات شخصية أو مالية. نُمى تقدم إرشاداً عاماً عن المنصة."
      : "Do not send personal or financial data. Numa provides general platform guidance.",
    thinkingStages: isAr
      ? ["استلمت سؤالك", "أفهم ما تحتاجه", "أرتب لك إجابة واضحة", "أراجع العرض النهائي"]
      : ["Question received", "Understanding what you need", "Preparing a clear answer", "Finalizing the presentation"],
    thinkingHint: isAr
      ? "يمكنك إغلاق المحادثة مؤقتًا، وستظهر الإجابة هنا فور اكتمالها."
      : "You can close the chat for now; the answer will appear here when ready.",
    limit: isAr
      ? "وصلت إلى حد هذه المحادثة. يمكنك بدء محادثة جديدة."
      : "You've reached this conversation's limit. You can start a new conversation.",
    error: isAr
      ? "تعذّر إرسال الرسالة الآن. حاول مرة أخرى بعد قليل."
      : "The message couldn't be sent. Please try again shortly.",
    remaining: isAr ? "رسائل متبقية" : "messages left",
    copied: isAr ? "تم النسخ" : "Copied",
    copyAnswer: isAr ? "نسخ الإجابة" : "Copy answer",
    welcomeTitle: isAr ? "كيف أقدر أساعدك؟" : "How can I help?",
  }), [isAr]);

  const suggestions = useMemo<Suggestion[]>(() => isAr
    ? [
        { label: "عرّفني على خدمات نشأة", icon: LayoutGrid, color: "text-[#00A99A] bg-[#E9FFFC]" },
        { label: "ما الفرق بين الباقات؟", icon: Layers3, color: "text-[#1A1F36] bg-[#EEF1F5]" },
        { label: "كيف أبدأ التجربة؟", icon: Rocket, color: "text-[#008F83] bg-[#E5FAF7]" },
        { label: "أريد حجز عرض تعريفي", icon: CalendarCheck2, color: "text-[#D88700] bg-[#FFF7E6]" },
      ]
    : [
        { label: "Tell me about Nashaa's services", icon: LayoutGrid, color: "text-[#00A99A] bg-[#E9FFFC]" },
        { label: "Compare the plans", icon: Layers3, color: "text-[#1A1F36] bg-[#EEF1F5]" },
        { label: "How do I start the trial?", icon: Rocket, color: "text-[#008F83] bg-[#E5FAF7]" },
        { label: "I want to book a demo", icon: CalendarCheck2, color: "text-[#D88700] bg-[#FFF7E6]" },
      ], [isAr]);

  // Visible by default: only an explicit `enabled: false` from the platform
  // setting may hide Numa. A slow settings request must not make the primary
  // floating action disappear from the landing page.
  if (!shouldRender || settingsQuery.data?.enabled === false) {
    return null;
  }

  const sessionLimitReached = sentCount >= MAX_SESSION_MESSAGES;

  const appendMessage = (
    role: ChatMessage["role"],
    content: string,
    structured?: StructuredResponse,
  ) => {
    const message: ChatMessage = { id: nextIdRef.current++, role, content, structured };
    setMessages(current => [...current, message]);
  };

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || chatMutation.isPending || sessionLimitReached) return;

    const history = messages.slice(-8).map(item => ({
      role: item.role,
      content: item.content.slice(0, 1_200),
    }));

    appendMessage("user", message);
    setInput("");
    setSentCount(count => count + 1);

    try {
      const result = await chatMutation.mutateAsync({ message, history, language });
      appendMessage("assistant", result.response, result.structured);
    } catch (error) {
      const messageFromServer = error instanceof Error ? error.message : "";
      appendMessage("assistant", messageFromServer || copy.error);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setInput("");
    setSentCount(0);
    chatMutation.reset();
  };

  const copyAnswer = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(current => current === message.id ? null : current), 1_800);
    } catch {
      setCopiedMessageId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={copy.button}
          className={`group fixed bottom-6 z-40 flex h-[68px] items-center rounded-full border border-white/80 bg-white p-1.5 shadow-[0_12px_38px_rgba(26,31,54,0.22)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(0,201,183,0.28)] active:translate-y-0 ${isAr ? "right-4 sm:right-6" : "left-4 sm:left-6"}`}
        >
          <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#E8FFFC] to-[#EEF2F4] ring-1 ring-[#00C9B7]/20">
            <img
              src={NUMA_IMAGE}
              alt=""
              aria-hidden="true"
              className="h-[78px] w-[78px] max-w-none translate-y-2 object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className={`absolute bottom-1 size-3 rounded-full border-2 border-white bg-emerald-500 ${isAr ? "left-0.5" : "right-0.5"}`} />
          </span>
          <span className="hidden px-3 text-sm font-bold text-[#1A1F36] sm:block">{copy.button}</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side={isAr ? "right" : "left"}
        dir={isAr ? "rtl" : "ltr"}
        className={`w-full gap-0 overflow-hidden border-[#00C9B7]/15 bg-[#F7FAFC] p-0 sm:max-w-[460px] [&>button]:top-5 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-white/80 [&>button]:p-2 [&>button]:opacity-100 [&>button]:shadow-sm ${isAr ? "[&>button]:right-auto [&>button]:left-4" : "[&>button]:right-4"}`}
      >
        <SheetHeader className="relative min-h-[104px] border-b border-white/70 bg-gradient-to-br from-[#E9FFFC] via-white to-[#EEF2F4] px-5 py-4 pe-14 text-start">
          <div className="flex items-center gap-3">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 ring-1 ring-[#00C9B7]/15">
              <img src={NUMA_IMAGE} alt={copy.name} className="h-[88px] w-[88px] max-w-none translate-y-2 object-contain" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-extrabold text-[#1A1F36]">{copy.name}</SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-1.5 text-xs text-[#5A6478]">
                <span className="size-2 rounded-full bg-emerald-500" />
                {copy.role}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(0,201,183,0.07),transparent_38%)] px-4 py-5">
            <div className="flex min-h-full flex-col gap-3">
              {messages.length === 0 && (
                <div className="my-auto space-y-5 py-3">
                  <div className="mx-auto max-w-[350px] rounded-3xl border border-[#00C9B7]/10 bg-white px-5 py-4 text-center shadow-[0_8px_30px_rgba(33,48,75,0.07)]">
                    <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8FFFC] to-[#EEF2F4] text-[#00A99A]">
                      <Sparkles className="size-4" />
                    </span>
                    <h2 className="text-sm font-extrabold text-[#1D273A]">{copy.welcomeTitle}</h2>
                    <p className="mt-1.5 text-xs leading-6 text-[#657087]">{copy.welcome}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggestions.map(suggestion => (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() => void sendMessage(suggestion.label)}
                        className="group flex min-h-14 items-center gap-2.5 rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2.5 text-start text-xs font-bold leading-5 text-[#384156] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#00C9B7]/35 hover:shadow-md"
                      >
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${suggestion.color}`}>
                          <suggestion.icon className="size-4 transition-transform group-hover:scale-110" />
                        </span>
                        <span>{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "ms-auto max-w-[85%]" : "me-auto w-full"}
                >
                  <div className={`flex gap-2 ${message.role === "assistant" ? "items-start" : "items-end"}`}>
                    {message.role === "assistant" && (
                      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#00C9B7]/20">
                        <img src={NUMA_IMAGE} alt="" aria-hidden="true" className="h-12 w-12 max-w-none translate-y-1 object-contain" />
                      </div>
                    )}
                    <div className={message.role === "user"
                      ? "rounded-2xl rounded-ee-md bg-[#1A1F36] px-4 py-3 text-sm leading-6 text-white shadow-sm"
                      : "min-w-0 flex-1 overflow-hidden rounded-3xl rounded-es-md border border-[#E7EBF0] bg-white shadow-[0_7px_24px_rgba(31,42,68,0.07)]"}
                    >
                      {message.role === "assistant" ? (
                        <>
                          <div className="h-1 w-full bg-gradient-to-r from-[#00C9B7] via-[#1A1F36] to-[#00A99A]" />
                          <div className="px-4 py-4">
                            {message.structured ? (
                              <StructuredAnswer response={message.structured} isAr={isAr} onNavigate={() => setOpen(false)} />
                            ) : (
                              <FallbackAnswer content={message.content} />
                            )}
                          </div>
                          <div className="flex items-center justify-end border-t border-[#F0F2F5] bg-[#FCFDFE] px-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => void copyAnswer(message)}
                              aria-label={copy.copyAnswer}
                              className="flex min-h-7 min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold text-[#7A8495] transition-colors hover:bg-white hover:text-[#009E91]"
                            >
                              {copiedMessageId === message.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                              {copiedMessageId === message.id ? copy.copied : copy.copyAnswer}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="me-auto flex w-full items-start gap-2" role="status" aria-live="polite">
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#00C9B7]/20">
                    <img src={NUMA_IMAGE} alt="" aria-hidden="true" className="h-12 w-12 max-w-none translate-y-1 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-es-md border border-[#DDE8E6] bg-white px-4 py-3 shadow-[0_7px_24px_rgba(31,42,68,0.06)]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#E7FAF7] text-[#009E91]">
                        <Loader2 className="size-4 animate-spin" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-[#263247]">{copy.thinkingStages[thinkingStage]}</p>
                        <p className="mt-0.5 text-[10px] leading-4 text-[#7A8497]">{copy.thinkingHint}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
                      {copy.thinkingStages.map((_, index) => (
                        <span
                          key={index}
                          className={`h-1 rounded-full transition-colors duration-300 ${index <= thinkingStage ? "bg-[#00AFA0]" : "bg-[#E6EAEE]"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {sessionLimitReached && (
                <div className="mx-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs leading-5 text-amber-800">
                  {copy.limit}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-gray-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {messages.length > 0 && (
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-[#7A8497]">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="flex min-h-0 min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 font-semibold text-[#5D687D] hover:bg-gray-50"
                >
                  <RotateCcw className="size-3.5" />
                  {copy.reset}
                </button>
                <span>{Math.max(0, MAX_SESSION_MESSAGES - sentCount)} {copy.remaining}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#FBFCFD] p-2 focus-within:border-[#00C9B7]/60 focus-within:ring-2 focus-within:ring-[#00C9B7]/10">
              <Textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_MESSAGE_CHARACTERS}
                rows={1}
                disabled={chatMutation.isPending || sessionLimitReached}
                placeholder={sessionLimitReached ? copy.limit : copy.placeholder}
                aria-label={copy.placeholder}
                className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="icon"
                aria-label={copy.send}
                disabled={!input.trim() || chatMutation.isPending || sessionLimitReached}
                className="size-10 shrink-0 rounded-xl bg-gradient-to-br from-[#00C9B7] to-[#009E91] text-white shadow-[0_5px_14px_rgba(0,201,183,0.28)] hover:from-[#00B8A8] hover:to-[#008F83]"
              >
                {chatMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-5" />}
              </Button>
            </form>

            <div className="mt-2 flex items-start justify-center gap-1.5 text-center text-[10px] leading-4 text-[#8A93A5]">
              <LockKeyhole className="mt-0.5 size-3 shrink-0" />
              <span>{copy.privacy}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
