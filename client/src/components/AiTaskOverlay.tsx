import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export type AiStage = { label: string; labelEn: string };

export type AiTaskOutcome = {
  title: string;
  titleEn: string;
  actionLabel: string;
  actionLabelEn: string;
  onAction: () => void;
};

type ServerStage = "queued" | "generating" | "validating" | "saving" | "completed" | "failed";

type TaskState = {
  running: boolean;
  taskKind: "promise" | "weekly-plan" | null;
  remoteJobId: number | null;
  title: string;
  titleEn: string;
  stageIndex: number;
  stages: AiStage[];
  elapsedMs: number;
  startedAt: number | null;
  progress: number;
  serverStage: ServerStage | null;
  error: string | null;
  done: boolean;
  minimized: boolean;
  outcome: AiTaskOutcome | null;
};

const IDLE: TaskState = {
  running: false,
  taskKind: null,
  remoteJobId: null,
  title: "",
  titleEn: "",
  stageIndex: 0,
  stages: [],
  elapsedMs: 0,
  startedAt: null,
  progress: 0,
  serverStage: null,
  error: null,
  done: false,
  minimized: false,
  outcome: null,
};

const STORAGE_KEY = "naashah:weekly-plan-generation";

type RunOptions<T> = {
  title: string;
  titleEn: string;
  stages: AiStage[];
  stageSeconds?: number[];
  run: () => Promise<T>;
  onDone?: (result: T) => AiTaskOutcome;
};

type TrackWeeklyPlanOptions = {
  jobId: number;
  title: string;
  titleEn: string;
  stages: AiStage[];
};

type Ctx = {
  runTask: <T>(opts: RunOptions<T>) => Promise<T>;
  trackWeeklyPlanTask: (opts: TrackWeeklyPlanOptions) => void;
  hasActiveWeeklyPlanTask: boolean;
  state: TaskState;
};

const AiTaskContext = createContext<Ctx | null>(null);

export function useAiTask() {
  const ctx = useContext(AiTaskContext);
  if (!ctx) throw new Error("useAiTask must be used inside AiTaskProvider");
  return ctx;
}

function readPersistedWeeklyPlanTask(): TaskState {
  if (typeof window === "undefined") return IDLE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return IDLE;
    const saved = JSON.parse(raw) as TrackWeeklyPlanOptions & { startedAt: number };
    if (!Number.isInteger(saved.jobId) || !Array.isArray(saved.stages)) return IDLE;
    return {
      ...IDLE,
      running: true,
      taskKind: "weekly-plan",
      remoteJobId: saved.jobId,
      title: saved.title,
      titleEn: saved.titleEn,
      stages: saved.stages,
      startedAt: saved.startedAt || Date.now(),
      elapsedMs: Math.max(0, Date.now() - (saved.startedAt || Date.now())),
      progress: 5,
      serverStage: "queued",
    };
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return IDLE;
  }
}

function friendlyTaskError(error: unknown, isAr: boolean) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  if (
    normalized.includes("signal is aborted") ||
    normalized.includes("aborterror") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed") ||
    normalized.includes("networkerror")
  ) {
    return isAr
      ? "انقطع الاتصال أثناء متابعة المهمة. إذا كان الطلب قد قُبل فسيستمر في الخلفية، ويمكنك فتح صفحة الخطة لاستعادة حالته."
      : "The connection was interrupted while tracking the task. If it was accepted, it will continue in the background and can be resumed from the weekly plan page.";
  }
  return message || (isAr ? "تعذّر إتمام المهمة. يرجى المحاولة مرة أخرى." : "The task could not be completed. Please try again.");
}

function deriveJourney(stage: ServerStage | null, elapsedMs: number, stageCount: number) {
  const last = Math.max(0, stageCount - 1);
  if (stage === "completed") return { index: last, progress: 100 };
  if (stage === "saving") return { index: last, progress: 96 };
  if (stage === "validating") return { index: Math.max(0, last - 1), progress: 90 };
  if (stage === "queued") return { index: 0, progress: 7 };

  const seconds = elapsedMs / 1000;
  let index = 1;
  if (seconds >= 10) index = 2;
  if (seconds >= 28) index = 3;
  if (seconds >= 55) index = 4;
  if (seconds >= 90) index = Math.max(1, last - 1);
  index = Math.min(index, Math.max(1, last - 1));

  // Smooth, asymptotic progress avoids a frozen bar while never pretending the
  // job is complete before the server validates and saves it.
  const progress = Math.min(88, Math.round(14 + 76 * (1 - Math.exp(-elapsedMs / 70_000))));
  return { index, progress };
}

export function AiTaskProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaskState>(readPersistedWeeklyPlanTask);
  const timers = useRef<number[]>([]);
  const utils = trpc.useUtils();

  const jobQuery = trpc.weeklyPlan.generationStatus.useQuery(
    { jobId: state.remoteJobId || 0 },
    {
      enabled: state.taskKind === "weekly-plan" && state.running && !!state.remoteJobId,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: query => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 3_000;
      },
      retry: 3,
    },
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!state.running || !state.startedAt) return;
    const ticker = window.setInterval(() => {
      setState(current => {
        if (!current.running || !current.startedAt) return current;
        const elapsedMs = Date.now() - current.startedAt;
        if (current.taskKind !== "weekly-plan") {
          return { ...current, elapsedMs };
        }
        const journey = deriveJourney(current.serverStage, elapsedMs, current.stages.length);
        return { ...current, elapsedMs, stageIndex: journey.index, progress: journey.progress };
      });
    }, 1_000);
    return () => window.clearInterval(ticker);
  }, [state.running, state.startedAt]);

  useEffect(() => {
    const job = jobQuery.data;
    if (!job || state.taskKind !== "weekly-plan" || job.id !== state.remoteJobId) return;

    if (job.status === "completed" && job.planId) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      void utils.weeklyPlan.list.invalidate();
      setState(current => ({
        ...current,
        running: false,
        done: true,
        progress: 100,
        stageIndex: Math.max(0, current.stages.length - 1),
        serverStage: "completed",
        outcome: {
          title: "اكتملت الخطة الأسبوعية بنجاح",
          titleEn: "Weekly plan completed",
          actionLabel: "عرض الخطة",
          actionLabelEn: "View plan",
          onAction: () => window.location.assign(`/staff/weekly-plan?planId=${job.planId}`),
        },
      }));
      return;
    }

    if (job.status === "failed") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      setState(current => ({
        ...current,
        running: false,
        error: job.errorMessage || "تعذّر إكمال الخطة. يرجى إعادة المحاولة.",
        progress: 100,
        serverStage: "failed",
      }));
      return;
    }

    setState(current => {
      const journey = deriveJourney(job.stage, current.elapsedMs, current.stages.length);
      return {
        ...current,
        serverStage: job.stage,
        progress: Math.max(job.progress, journey.progress),
        stageIndex: journey.index,
      };
    });
  }, [jobQuery.data, state.taskKind, state.remoteJobId, utils.weeklyPlan.list]);

  const runTask = useCallback(async <T,>(opts: RunOptions<T>): Promise<T> => {
    clearTimers();
    const startedAt = Date.now();
    setState({
      ...IDLE,
      running: true,
      taskKind: "promise",
      title: opts.title,
      titleEn: opts.titleEn,
      stages: opts.stages,
      startedAt,
      progress: 8,
    });

    const seconds = opts.stageSeconds ?? opts.stages.map(() => 8);
    let accumulated = 0;
    opts.stages.forEach((_, index) => {
      if (index === 0) return;
      accumulated += seconds[index - 1] ?? 8;
      timers.current.push(window.setTimeout(() => {
        setState(current => current.running ? {
          ...current,
          stageIndex: index,
          progress: Math.min(92, ((index + 0.35) / Math.max(1, opts.stages.length)) * 100),
        } : current);
      }, accumulated * 1_000));
    });

    try {
      const result = await opts.run();
      clearTimers();
      const outcome = opts.onDone ? opts.onDone(result) : null;
      setState(current => ({
        ...current,
        running: false,
        done: true,
        outcome,
        progress: 100,
        stageIndex: Math.max(0, opts.stages.length - 1),
      }));
      if (!outcome) window.setTimeout(() => setState(IDLE), 1_200);
      return result;
    } catch (error) {
      clearTimers();
      const isAr = document.documentElement.dir === "rtl";
      setState(current => ({ ...current, running: false, error: friendlyTaskError(error, isAr) }));
      throw error;
    }
  }, [clearTimers]);

  const trackWeeklyPlanTask = useCallback((opts: TrackWeeklyPlanOptions) => {
    clearTimers();
    const startedAt = Date.now();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...opts, startedAt }));
    setState({
      ...IDLE,
      running: true,
      taskKind: "weekly-plan",
      remoteJobId: opts.jobId,
      title: opts.title,
      titleEn: opts.titleEn,
      stages: opts.stages,
      startedAt,
      progress: 5,
      serverStage: "queued",
    });
  }, [clearTimers]);

  const contextValue = useMemo<Ctx>(() => ({
    runTask,
    trackWeeklyPlanTask,
    hasActiveWeeklyPlanTask: state.taskKind === "weekly-plan" && state.running,
    state,
  }), [runTask, trackWeeklyPlanTask, state]);

  return (
    <AiTaskContext.Provider value={contextValue}>
      {children}
      <AiTaskCard
        state={state}
        onDismiss={() => setState(IDLE)}
        onToggleMinimize={() => setState(current => ({ ...current, minimized: !current.minimized }))}
      />
    </AiTaskContext.Provider>
  );
}

function AiTaskCard({
  state,
  onDismiss,
  onToggleMinimize,
}: {
  state: TaskState;
  onDismiss: () => void;
  onToggleMinimize: () => void;
}) {
  const isAr = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  if (!state.running && !state.error && !state.done) return null;

  const seconds = Math.floor(state.elapsedMs / 1_000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const activeStage = state.stages[state.stageIndex];
  const reassuranceAr = [
    "نبني محتوى متكاملاً دون اختصار الأقسام.",
    state.taskKind === "weekly-plan" ? "الطلب محفوظ ويمكنك التنقل بأمان داخل التطبيق." : "يمكنك التنقل داخل التطبيق وسيستمر التنفيذ في هذه الجلسة.",
    "نراجع تناسق الأنشطة مع العمر وإطار EYFS.",
    "الخطة تعمل بشكل طبيعي حتى لو طال المحتوى.",
  ][Math.floor(seconds / 12) % 4];
  const reassuranceEn = [
    "Building complete content without shortening sections.",
    state.taskKind === "weekly-plan" ? "The request is saved; you can safely use the rest of the app." : "You can navigate within the app while this continues in the current session.",
    "Checking age alignment and EYFS consistency.",
    "Generation is active even when the plan is extensive.",
  ][Math.floor(seconds / 12) % 4];

  if (state.running && state.minimized) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] sm:right-auto sm:w-[390px] pointer-events-none">
        <button
          type="button"
          onClick={onToggleMinimize}
          className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-primary/20 bg-background/95 shadow-2xl backdrop-blur-xl text-start"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{isAr ? state.title : state.titleEn}</span>
              <span className="block truncate text-xs text-muted-foreground">{activeStage ? (isAr ? activeStage.label : activeStage.labelEn) : ""}</span>
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{mm}:{ss}</span>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-1 bg-muted">
            <div className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400 transition-all duration-1000" style={{ width: `${state.progress}%` }} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] sm:right-auto sm:w-[440px] pointer-events-none" aria-live="polite">
      <section className="pointer-events-auto overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <header className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-amber-400/10 px-5 pb-4 pt-5">
          <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              state.error ? "bg-destructive/10 text-destructive" : state.done ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
            }`}>
              {state.error ? <AlertCircle className="h-6 w-6" /> : state.done ? <Check className="h-6 w-6" /> : <Sparkles className="h-6 w-6 animate-pulse" />}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="font-bold leading-tight text-foreground">
                {state.outcome ? (isAr ? state.outcome.title : state.outcome.titleEn) : (isAr ? state.title : state.titleEn)}
              </h3>
              {!state.error && !state.done && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> <span className="tabular-nums">{mm}:{ss}</span></span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{state.taskKind === "weekly-plan" ? (isAr ? "تم استلام الطلب وحفظه" : "Request accepted and saved") : (isAr ? "الطلب قيد التنفيذ" : "Request is running")}</span>
                </div>
              )}
            </div>
            {state.running ? (
              <button type="button" onClick={onToggleMinimize} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-background/70" aria-label={isAr ? "تصغير" : "Minimize"}>
                <ChevronDown className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={onDismiss} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-background/70" aria-label={isAr ? "إغلاق" : "Close"}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {state.outcome ? (
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isAr ? "الخطة الكاملة محفوظة كمسودة وجاهزة للمراجعة والتعديل ثم النشر." : "The complete plan is saved as a draft, ready to review, edit and publish."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { state.outcome?.onAction(); onDismiss(); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
                {isAr ? state.outcome.actionLabel : state.outcome.actionLabelEn}
              </button>
              <button type="button" onClick={onDismiss} className="h-11 rounded-xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-accent">
                {isAr ? "لاحقاً" : "Later"}
              </button>
            </div>
          </div>
        ) : state.error ? (
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-foreground/85">{state.error}</p>
            <button type="button" onClick={() => { window.location.assign("/staff/weekly-plan"); onDismiss(); }} className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              {isAr ? "العودة إلى إنشاء الخطة" : "Return to plan creation"}
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{activeStage ? (isAr ? activeStage.label : activeStage.labelEn) : ""}</span>
                <span className="tabular-nums text-muted-foreground">{state.progress}% <span className="opacity-70">{isAr ? "تقديري" : "estimated"}</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="relative h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400 transition-all duration-1000 ease-out" style={{ width: `${state.progress}%` }}>
                  <span className="absolute inset-0 animate-pulse bg-white/20" />
                </div>
              </div>
            </div>

            <ol className="max-h-[260px] space-y-2 overflow-y-auto px-5 py-4">
              {state.stages.map((stage, index) => {
                const status = index < state.stageIndex ? "done" : index === state.stageIndex ? "active" : "todo";
                return (
                  <li key={index} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${status === "active" ? "bg-primary/8" : ""}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      status === "done" ? "bg-emerald-500 text-white" : status === "active" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                    }`}>
                      {status === "done" ? <Check className="h-3.5 w-3.5" /> : status === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : index + 1}
                    </span>
                    <span className={`text-sm ${status === "todo" ? "text-muted-foreground" : "font-medium text-foreground"}`}>{isAr ? stage.label : stage.labelEn}</span>
                  </li>
                );
              })}
            </ol>

            <div className="border-t border-border/60 bg-muted/35 px-5 py-3">
              <p key={Math.floor(seconds / 12)} className="text-xs leading-relaxed text-muted-foreground animate-in fade-in duration-500">
                {isAr ? reassuranceAr : reassuranceEn}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
