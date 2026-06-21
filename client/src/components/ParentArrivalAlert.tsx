import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, X } from "lucide-react";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface ArrivalAlert {
  id: number;
  childId: number;
  childFirstName: string;
  childLastName: string;
  childPhoto?: string;
  parentName: string;
  requestedAt: string | Date;
}

/**
 * Full-screen persistent alert component for staff/teachers.
 * Shows when a parent presses "I'm here" and stays visible until acknowledged.
 * Plays a gentle, nursery-friendly notification sound and optionally vibrates.
 */
export function ParentArrivalAlert() {
  const [alerts, setAlerts] = useState<ArrivalAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playRepeating, stopRepeating, vibrate, settings } = useNotificationSound();

  // Query active pickup requests (poll every 5 seconds for real-time)
  const { data: activeRequests, refetch } = trpc.pickup.active.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Listen for service worker messages about parent arrival
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PARENT_ARRIVAL_ALERT') {
        refetch();
      }
      if (event.data?.type === 'ACKNOWLEDGE_PICKUP' && event.data?.pickupRequestId) {
        handleAcknowledge(event.data.pickupRequestId);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refetch]);

  const sendToReceptionMutation = trpc.pickup.teacherSendToReception.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Filter for new 'waiting_teacher' requests that haven't been dismissed
  useEffect(() => {
    if (!activeRequests) return;
    const waitingRequests = activeRequests.filter(
      (r: any) => r.status === "waiting_teacher" && !dismissed.has(r.id)
    );
    setAlerts(waitingRequests as ArrivalAlert[]);
  }, [activeRequests, dismissed]);

  // Play gentle notification sound and vibrate when there are active alerts
  useEffect(() => {
    if (alerts.length > 0) {
      // Start playing gentle notification sound in a loop
      playRepeating();
      // Vibrate device gently
      vibrate();
      // Set up repeating gentle vibration
      vibrationIntervalRef.current = setInterval(() => {
        vibrate();
      }, 5000);
    } else {
      // Stop sound and vibration
      stopRepeating();
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
    }

    return () => {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
    };
  }, [alerts.length, playRepeating, stopRepeating, vibrate]);

  const handleAcknowledge = (requestId: number) => {
    // Stop sound immediately
    stopRepeating();
    // Dismiss this alert
    setDismissed((prev) => new Set(Array.from(prev).concat(requestId)));
    // Send child to reception (Step 2)
    sendToReceptionMutation.mutate({ id: requestId });
  };

  const handleDismissOnly = (requestId: number) => {
    // Just dismiss from UI without changing status
    setDismissed((prev) => new Set(Array.from(prev).concat(requestId)));
    if (alerts.length <= 1) {
      stopRepeating();
    }
  };

  // Don't render anything if no alerts
  if (alerts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg mx-4 space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-emerald-400 animate-in zoom-in-95 duration-300"
          >
            {/* Header with friendly styling */}
            <div className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center gap-3">
              <div className="relative">
                <Bell className="h-7 w-7 animate-[swing_2s_ease-in-out_infinite]" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-300 rounded-full animate-ping" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">ولي أمر وصل للاستلام</h2>
                <p className="text-emerald-100 text-sm">يرجى الاستجابة</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/20"
                onClick={() => handleDismissOnly(alert.id)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Child info */}
            <div className="px-6 py-6">
              <div className="flex items-center gap-4 mb-6">
                {alert.childPhoto ? (
                  <img
                    src={alert.childPhoto}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover border-4 border-emerald-100 shadow-lg"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center text-3xl font-bold text-emerald-600 border-4 border-emerald-100">
                    {alert.childFirstName?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {alert.childFirstName} {alert.childLastName}
                  </p>
                  <p className="text-gray-600 mt-1">
                    ولي الأمر: <span className="font-semibold">{alert.parentName}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    وقت الطلب:{" "}
                    {new Date(alert.requestedAt).toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full py-6 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-transform active:scale-[0.97]"
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={sendToReceptionMutation.isPending}
                >
                  <CheckCircle2 className="h-6 w-6 ml-2" />
                  {sendToReceptionMutation.isPending
                    ? "جاري الإرسال..."
                    : "تم إرسال الطفل للاستقبال"}
                </Button>
              </div>
            </div>

            {/* Animated bottom bar - gentle gradient */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400" />
          </div>
        ))}
      </div>

      {/* Add swing animation keyframes */}
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(10deg); }
          75% { transform: rotate(-10deg); }
        }
      `}</style>
    </div>
  );
}
