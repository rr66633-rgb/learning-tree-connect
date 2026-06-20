import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, X } from "lucide-react";

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
 * Plays a loud alarm sound and triggers device vibration.
 */
export function ParentArrivalAlert() {
  const [alerts, setAlerts] = useState<ArrivalAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Query active pickup requests (poll every 5 seconds for real-time)
  const { data: activeRequests, refetch } = trpc.pickup.active.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Listen for service worker messages about parent arrival
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PARENT_ARRIVAL_ALERT') {
        // Immediately refetch to show the alert
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

  const acknowledgeMutation = trpc.pickup.acknowledge.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Filter for new 'waiting' requests that haven't been dismissed
  useEffect(() => {
    if (!activeRequests) return;
    const waitingRequests = activeRequests.filter(
      (r: any) => r.status === "waiting" && !dismissed.has(r.id)
    );
    setAlerts(waitingRequests as ArrivalAlert[]);
  }, [activeRequests, dismissed]);

  // Play alarm sound and vibrate when there are active alerts
  useEffect(() => {
    if (alerts.length > 0) {
      // Start playing alarm sound in a loop
      playAlarmSound();
      // Vibrate device
      triggerVibration();
      // Set up repeating vibration
      intervalRef.current = setInterval(() => {
        triggerVibration();
      }, 3000);
    } else {
      // Stop sound and vibration
      stopAlarmSound();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [alerts.length]);

  const playAlarmSound = useCallback(() => {
    if (!audioRef.current) {
      // Create an audio element with a generated alarm tone
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Create an urgent alarm pattern
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

      // Modulate frequency for urgency
      const now = audioCtx.currentTime;
      for (let i = 0; i < 20; i++) {
        oscillator.frequency.setValueAtTime(880, now + i * 0.5);
        oscillator.frequency.setValueAtTime(1100, now + i * 0.5 + 0.25);
      }

      oscillator.start();
      oscillator.stop(now + 10); // Play for 10 seconds max

      // Store reference for cleanup
      (audioRef as any).current = { oscillator, audioCtx, gainNode };

      // Repeat after 10 seconds if still active
      setTimeout(() => {
        audioRef.current = null;
        if (alerts.length > 0) {
          playAlarmSound();
        }
      }, 10000);
    }
  }, [alerts.length]);

  const stopAlarmSound = useCallback(() => {
    if (audioRef.current) {
      try {
        const ref = audioRef.current as any;
        if (ref.oscillator) {
          ref.oscillator.stop();
        }
        if (ref.audioCtx) {
          ref.audioCtx.close();
        }
      } catch (e) {
        // Ignore errors on cleanup
      }
      audioRef.current = null;
    }
  }, []);

  const triggerVibration = () => {
    if ("vibrate" in navigator) {
      // Strong vibration pattern: long-short-long-short-long
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
    }
  };

  const handleAcknowledge = (requestId: number) => {
    // Stop sound immediately
    stopAlarmSound();
    // Dismiss this alert
    setDismissed((prev) => new Set(Array.from(prev).concat(requestId)));
    // Call the acknowledge endpoint (moves status to 'called')
    acknowledgeMutation.mutate({ id: requestId });
  };

  const handleDismissOnly = (requestId: number) => {
    // Just dismiss from UI without changing status
    setDismissed((prev) => new Set(Array.from(prev).concat(requestId)));
    if (alerts.length <= 1) {
      stopAlarmSound();
    }
  };

  // Don't render anything if no alerts
  if (alerts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Pulsing background effect */}
      <div className="absolute inset-0 animate-pulse bg-red-600/20 pointer-events-none" />

      <div className="relative w-full max-w-lg mx-4 space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-red-500 animate-in zoom-in-95 duration-300"
          >
            {/* Header with urgent styling */}
            <div className="bg-red-600 text-white px-6 py-4 flex items-center gap-3">
              <div className="relative">
                <Bell className="h-8 w-8 animate-bounce" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-ping" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">ولي أمر وصل للاستلام</h2>
                <p className="text-red-100 text-sm">يرجى الاستجابة فوراً</p>
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
                    className="h-20 w-20 rounded-full object-cover border-4 border-red-200 shadow-lg"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center text-3xl font-bold text-red-600 border-4 border-red-200">
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
                  className="w-full py-6 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg transition-transform active:scale-[0.97]"
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  <CheckCircle2 className="h-6 w-6 ml-2" />
                  {acknowledgeMutation.isPending
                    ? "جاري المعالجة..."
                    : "تم - سأحضر الطفل"}
                </Button>
              </div>
            </div>

            {/* Animated bottom bar */}
            <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
