import { useState, useEffect, useRef } from "react";

interface LogEntry {
  id: number;
  time: string;
  type: "request" | "response" | "error" | "info";
  message: string;
}

let logId = 0;
const logEntries: LogEntry[] = [];
let listeners: Array<() => void> = [];

function addLog(type: LogEntry["type"], message: string) {
  const entry: LogEntry = {
    id: ++logId,
    time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    type,
    message: message.substring(0, 300),
  };
  logEntries.push(entry);
  if (logEntries.length > 50) logEntries.shift();
  listeners.forEach((l) => l());
}

// Intercept global fetch
const originalFetch = window.fetch;
window.fetch = async function (...args: Parameters<typeof fetch>) {
  const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0]);
  const method = (args[1]?.method || "GET").toUpperCase();
  const shortUrl = url.length > 80 ? url.substring(0, 80) + "..." : url;
  
  addLog("request", `${method} ${shortUrl}`);
  
  try {
    const response = await originalFetch.apply(window, args);
    const status = response.status;
    addLog("response", `${status} ${method} ${shortUrl}`);
    
    if (!response.ok) {
      try {
        const clone = response.clone();
        const text = await clone.text();
        addLog("error", `Body: ${text.substring(0, 200)}`);
      } catch (e) {
        // ignore
      }
    }
    
    return response;
  } catch (err: any) {
    addLog("error", `FETCH FAILED: ${err?.message || err} | URL: ${shortUrl}`);
    throw err;
  }
};

// Intercept console.error
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  addLog("error", args.map((a) => (typeof a === "object" ? JSON.stringify(a).substring(0, 150) : String(a))).join(" "));
  originalConsoleError.apply(console, args);
};

// Catch unhandled errors
window.addEventListener("error", (e) => {
  addLog("error", `UNCAUGHT: ${e.message} at ${e.filename}:${e.lineno}`);
});

window.addEventListener("unhandledrejection", (e) => {
  addLog("error", `UNHANDLED PROMISE: ${e.reason?.message || e.reason}`);
});

export function DebugOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([...logEntries]);
  const [visible, setVisible] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    addLog("info", `Debug overlay started | Platform: ${(window as any).Capacitor?.getPlatform?.() || "unknown"} | UA: ${navigator.userAgent.substring(0, 100)}`);
    
    const listener = () => setLogs([...logEntries]);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!visible) return null;

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 10,
          zIndex: 99999,
          background: "#ff0000",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: "bold",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
        }}
      >
        DEBUG ({logs.filter((l) => l.type === "error").length} errors)
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40vh",
        zIndex: 99999,
        background: "rgba(0,0,0,0.95)",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: 11,
        display: "flex",
        flexDirection: "column",
        borderTop: "2px solid #ff0000",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: "#333" }}>
        <span style={{ fontWeight: "bold", color: "#ff6666" }}>DEBUG LOG ({logs.length})</span>
        <div>
          <button onClick={() => setMinimized(true)} style={{ color: "#fff", background: "#555", border: "none", padding: "2px 8px", marginRight: 4, borderRadius: 4 }}>
            MIN
          </button>
          <button onClick={() => setVisible(false)} style={{ color: "#fff", background: "#900", border: "none", padding: "2px 8px", borderRadius: 4 }}>
            CLOSE
          </button>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "4px 8px" }}>
        {logs.map((log) => (
          <div
            key={log.id}
            style={{
              color: log.type === "error" ? "#ff4444" : log.type === "request" ? "#44aaff" : log.type === "response" ? "#44ff44" : "#aaaaaa",
              marginBottom: 2,
              wordBreak: "break-all",
            }}
          >
            <span style={{ color: "#888" }}>[{log.time}]</span> {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
