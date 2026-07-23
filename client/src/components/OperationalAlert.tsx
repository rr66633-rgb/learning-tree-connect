import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * OperationalAlert - Persistent pickup alert banner with repeating sound
 * 
 * This component polls for unacknowledged pickup alerts and displays
 * a full-width persistent banner with:
 * - Repeating alert sound every N seconds
 * - Child photo, name, class, and wait time
 * - "Request Received" acknowledgment button
 * - Auto-escalation indicator after 2 minutes
 */
export function OperationalAlert() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch unacknowledged alerts
  const { data: unackedAlerts, refetch } = trpc.pickup.unacknowledgedAlerts.useQuery(undefined, {
    refetchInterval: 3000, // Poll every 3 seconds for real-time feel
  });

  // Fetch alert settings
  const { data: alertSettings } = trpc.pickup.alertSettings.useQuery();

  // Acknowledge mutation
  const acknowledgeMutation = trpc.pickup.acknowledge.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (unackedAlerts && unackedAlerts.length > 0) {
      setAlerts(unackedAlerts);
    } else {
      setAlerts([]);
    }
  }, [unackedAlerts]);

  // Generate alert sound using Web Audio API
  const playAlertSound = useCallback(() => {
    if (isMuted) return;
    
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const volume = (alertSettings?.volume ?? 80) / 100;
      const tone = alertSettings?.tone ?? 'urgent';

      // Create a distinctive multi-tone alert sound
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(volume * 0.6, now);

      if (tone === 'urgent' || tone === 'alarm') {
        // Urgent: Two-tone alternating (like a service bell)
        const frequencies = tone === 'alarm' ? [880, 1100, 880, 1100] : [660, 880, 660, 880];
        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = tone === 'alarm' ? 'square' : 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          osc.connect(gainNode);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.12);
        });
        gainNode.gain.setValueAtTime(volume * 0.6, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.7);
      } else if (tone === 'gentle') {
        // Gentle: Soft chime
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.linearRampToValueAtTime(784, now + 0.2);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.4);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      } else {
        // Chime: Musical chime
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          osc.connect(gainNode);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.2);
        });
        gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
      }

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch (e) {
      console.warn('Alert sound failed:', e);
    }
  }, [isMuted, alertSettings]);

  // Repeating sound when alerts are active
  useEffect(() => {
    if (alerts.length > 0 && !isMuted) {
      // Play immediately
      playAlertSound();
      
      // Repeat at configured interval
      const repeatInterval = (alertSettings?.repeatIntervalSeconds ?? 5) * 1000;
      soundIntervalRef.current = setInterval(() => {
        playAlertSound();
      }, repeatInterval);
    }

    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };
  }, [alerts.length, isMuted, alertSettings?.repeatIntervalSeconds, playAlertSound]);

  // Handle acknowledge
  const handleAcknowledge = (pickupRequestId: number) => {
    acknowledgeMutation.mutate({ pickupRequestId });
    // Stop sound immediately for this alert
    if (alerts.length <= 1) {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    }
  };

  // Calculate wait time
  const getWaitTime = (requestedAt: string | Date) => {
    const diff = Date.now() - new Date(requestedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (minutes > 0) return (isAr ? `${minutes} دقيقة ${seconds} ثانية` : `${minutes}Minute${seconds}Second`);
    return (isAr ? `${seconds} ثانية` : `${seconds}Second`);
  };

  // Update wait times every second
  const [, setTick] = useState(0);
  useEffect(() => {
    if (alerts.length > 0) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
      {alerts.map((alert) => {
        const waitMs = Date.now() - new Date(alert.requestedAt).getTime();
        const isEscalated = waitMs > ((alertSettings?.escalationMinutes ?? 2) * 60000);

        return (
          <div
            key={alert.id}
            className={`border-b-2 p-4 ${
              isEscalated
                ? 'bg-red-600 border-red-800 text-white'
                : 'bg-amber-500 border-amber-700 text-white'
            }`}
          >
            <div className="container flex items-center justify-between gap-4">
              {/* Left: Alert info */}
              <div className="flex items-center gap-4 flex-1">
                {/* Pulsing alert icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isEscalated ? 'bg-red-700 animate-pulse' : 'bg-amber-600 animate-pulse'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>

                {/* Child photo */}
                {alert.childPhoto && (
                  <img
                    src={alert.childPhoto}
                    alt={alert.childName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/50"
                  />
                )}

                {/* Alert details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">{alert.childName}</span>
                    {alert.className && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {alert.className}
                      </Badge>
                    )}
                    {isEscalated && (
                      <Badge variant="destructive" className="bg-red-900 text-white animate-pulse">
                        تصعيد!
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm opacity-90 mt-0.5">
                    ⏱ وقت الانتظار: <span className="font-mono font-bold">{getWaitTime(alert.requestedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  {isMuted ? '🔇' : '🔊'}
                </Button>
                <Button
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={acknowledgeMutation.isPending}
                  className={`font-bold text-base px-6 py-2 ${
                    isEscalated
                      ? 'bg-white text-red-700 hover:bg-gray-100'
                      : 'bg-white text-amber-700 hover:bg-gray-100'
                  }`}
                >
                  {acknowledgeMutation.isPending ? '...' : 'تم الاستلام ✓'}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
