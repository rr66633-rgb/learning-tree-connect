import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/** Key guarding the one-shot auto reload, so a broken build cannot loop. */
const RELOAD_GUARD = "app_chunk_reload_attempted";

/**
 * A failed dynamic import is not really an application error: it means the
 * browser asked for a code chunk that no longer exists at that URL. It happens
 * whenever the app is redeployed (or the dev server restarts) while a tab is
 * open -- the page still holds the old chunk names. The fix is simply to load
 * the page again, so that is done automatically rather than showing the user a
 * failure they cannot act on.
 */
function isChunkLoadError(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error ?? "");
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(String((error as Error)?.name ?? ""))
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // SECURITY FIX: the previous version rendered `error.stack` verbatim inside
    // a <pre> on the error screen -- so a crash showed the user absolute module
    // paths (".../src/pages/staff/Dashboard.tsx"), the bundler's internal URLs
    // and the component tree. The detail belongs in the console for a
    // developer, never on screen.
    console.error("[App] unhandled render error:", error, info?.componentStack);

    // Stale chunk after a deploy: reload once, silently. The guard means a
    // genuinely broken build shows the message below instead of looping.
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_GUARD)) {
      sessionStorage.setItem(RELOAD_GUARD, "1");
      window.location.reload();
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem(RELOAD_GUARD);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isAr =
        typeof document === "undefined" || document.documentElement.dir !== "ltr";

      // Two different situations, two different explanations -- a stale build
      // is fixed by reloading, a real crash is not the user's fault either way.
      const title = this.state.isChunkError
        ? isAr ? "تم تحديث التطبيق" : "The app was updated"
        : isAr ? "حدث خطأ غير متوقع" : "Something went wrong";

      const body = this.state.isChunkError
        ? isAr
          ? "صدر إصدار جديد أثناء استخدامك للصفحة. أعد تحميلها للمتابعة."
          : "A new version was released while this page was open. Reload to continue."
        : isAr
          ? "تعذّر عرض هذه الصفحة. أعد تحميلها، وإذا تكرر الأمر تواصل مع مسؤول النظام."
          : "This page could not be displayed. Reload it, and contact your administrator if it keeps happening.";

      return (
        <div
          className="flex items-center justify-center min-h-screen p-8 bg-background"
          dir={isAr ? "rtl" : "ltr"}
        >
          <div className="flex flex-col items-center text-center w-full max-w-md p-8">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
              <AlertTriangle size={26} className="text-destructive" />
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{body}</p>

            <button
              onClick={this.handleReload}
              className={cn(
                "flex items-center gap-2 px-5 h-11 rounded-xl",
                "bg-primary text-primary-foreground text-sm font-medium",
                "hover:opacity-90 cursor-pointer transition-opacity"
              )}
            >
              <RotateCcw size={16} />
              {isAr ? "إعادة تحميل الصفحة" : "Reload page"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
