import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Sparkles, Check, Loader2, AlertCircle, X, ArrowLeft } from "lucide-react";

/**
 * A single centred progress card for long AI generations.
 *
 * Why it exists: a generation takes tens of seconds, and until now the only
 * feedback was a spinner on the button plus one line of text. A teacher had no
 * idea whether anything was happening, how far along it was, or whether leaving
 * the page would throw the work away.
 *
 * Two things this provides:
 *  1. Visible staged progress, so the wait is legible rather than a frozen screen.
 *  2. The work is owned HERE, above the router, not by the page that started it.
 *     Navigating away therefore neither cancels the request nor loses its
 *     result -- the card follows the user and reports when it finishes.
 */

export type AiStage = { label: string; labelEn: string };

/** What to offer the user once the work finishes. */
export type AiTaskOutcome = {
  /** Success headline, e.g. "تم إنشاء الخطة الأسبوعية". */
  title: string;
  titleEn: string;
  /** Label for the button that takes them to the result. */
  actionLabel: string;
  actionLabelEn: string;
  /** Called when they press it -- usually a route change. */
  onAction: () => void;
};

type TaskState = {
  running: boolean;
  title: string;
  titleEn: string;
  stageIndex: number;
  stages: AiStage[];
  elapsedMs: number;
  error: string | null;
  done: boolean;
  outcome: AiTaskOutcome | null;
};

const IDLE: TaskState = {
  running: false, title: "", titleEn: "", stageIndex: 0, stages: [],
  elapsedMs: 0, error: null, done: false, outcome: null,
};

type RunOptions<T> = {
  title: string;
  titleEn: string;
  stages: AiStage[];
  /** Rough seconds per stage, used to advance the indicator believably. */
  stageSeconds?: number[];
  run: () => Promise<T>;
  /**
   * Builds the success state from the result. Without this the card simply
   * closes; with it the card stays and offers a button that takes the user
   * straight to what was just created -- otherwise they are left on the form
   * with no idea where the output went.
   */
  onDone?: (result: T) => AiTaskOutcome;
};

type Ctx = { runTask: <T>(opts: RunOptions<T>) => Promise<T>; state: TaskState };
const AiTaskContext = createContext<Ctx | null>(null);

export function useAiTask() {
  const ctx = useContext(AiTaskContext);
  if (!ctx) throw new Error("useAiTask must be used inside AiTaskProvider");
  return ctx;
}

export function AiTaskProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaskState>(IDLE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const runTask = useCallback(async <T,>(opts: RunOptions<T>): Promise<T> => {
    clearTimers();
    const startedAt = Date.now();
    setState({
      running: true, title: opts.title, titleEn: opts.titleEn,
      stageIndex: 0, stages: opts.stages, elapsedMs: 0, error: null, done: false,
      outcome: null,
    });

    // Elapsed time is real. Stage advancement is an estimate -- the server does
    // not stream progress, so pretending to know the exact percentage would be
    // dishonest. Showing the true elapsed seconds keeps it truthful.
    ticker.current = setInterval(() => {
      setState((s) => (s.running ? { ...s, elapsedMs: Date.now() - startedAt } : s));
    }, 1000);

    const seconds = opts.stageSeconds ?? opts.stages.map(() => 8);
    let acc = 0;
    opts.stages.forEach((_, i) => {
      if (i === 0) return;
      acc += seconds[i - 1] ?? 8;
      timers.current.push(
        setTimeout(() => setState((s) => (s.running ? { ...s, stageIndex: i } : s)), acc * 1000),
      );
    });

    try {
      const result = await opts.run();
      clearTimers();
      const outcome = opts.onDone ? opts.onDone(result) : null;
      setState((s) => ({
        ...s, running: false, done: true, outcome,
        stageIndex: opts.stages.length - 1,
      }));
      // With a follow-up action the card waits for the user; without one there
      // is nothing to act on, so it closes itself after the tick is visible.
      if (!outcome) setTimeout(() => setState(IDLE), 1200);
      return result;
    } catch (e: any) {
      clearTimers();
      setState((s) => ({ ...s, running: false, error: e?.message || "" }));
      throw e;
    }
  }, [clearTimers]);

  return (
    <AiTaskContext.Provider value={{ runTask, state }}>
      {children}
      <AiTaskCard state={state} onDismiss={() => setState(IDLE)} />
    </AiTaskContext.Provider>
  );
}

function AiTaskCard({ state, onDismiss }: { state: TaskState; onDismiss: () => void }) {
  const isAr = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  if (!state.running && !state.error && !state.done) return null;

  const seconds = Math.floor(state.elapsedMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl border border-border overflow-hidden">
        <div className="flex items-start gap-3 p-5 pb-4">
          <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${
            state.error ? "bg-destructive/10" : "bg-primary/10"
          }`}>
            {state.error
              ? <AlertCircle className="h-5 w-5 text-destructive" />
              : state.done
                ? <Check className="h-5 w-5 text-emerald-600" />
                : <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground leading-tight">
              {state.outcome
                ? (isAr ? state.outcome.title : state.outcome.titleEn)
                : (isAr ? state.title : state.titleEn)}
            </h3>
            {!state.error && (
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                {mm}:{ss}
              </p>
            )}
          </div>
          {(state.error || state.outcome) && (
            <button
              onClick={onDismiss}
              className="shrink-0 rounded-lg p-1.5 hover:bg-accent transition-colors"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {state.outcome ? (
          // Success: the user is told what happened and given one obvious way
          // to reach the result, instead of being dropped back on the form.
          <div className="px-5 pb-5 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isAr
                ? "المحتوى جاهز. يمكنك عرضه الآن أو الرجوع إليه لاحقاً."
                : "Your content is ready. Open it now, or come back to it later."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { state.outcome?.onAction(); onDismiss(); }}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
                {isAr ? state.outcome.actionLabel : state.outcome.actionLabelEn}
              </button>
              <button
                onClick={onDismiss}
                className="h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                {isAr ? "لاحقاً" : "Later"}
              </button>
            </div>
          </div>
        ) : state.error ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-foreground/80 leading-relaxed">{state.error}</p>
          </div>
        ) : (
          <>
            <ol className="px-5 pb-4 space-y-2.5">
              {state.stages.map((stage, i) => {
                const status = state.done || i < state.stageIndex ? "done" : i === state.stageIndex ? "active" : "todo";
                return (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                      status === "done" ? "bg-emerald-600 text-white"
                      : status === "active" ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {status === "done" ? <Check className="h-3 w-3" />
                        : status === "active" ? <Loader2 className="h-3 w-3 animate-spin" />
                        : i + 1}
                    </span>
                    <span className={`text-sm transition-colors ${
                      status === "todo" ? "text-muted-foreground" : "text-foreground"
                    }`}>
                      {isAr ? stage.label : stage.labelEn}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="h-1 w-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${state.done ? 100 : Math.min(92, ((state.stageIndex + 0.5) / Math.max(1, state.stages.length)) * 100)}%` }}
              />
            </div>
            <p className="px-5 py-3 text-xs text-muted-foreground bg-muted/40">
              {isAr
                ? "يمكنك متابعة استخدام التطبيق، وسيستمر العمل حتى بعد مغادرة هذه الصفحة."
                : "You can keep using the app -- this continues even if you leave the page."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
