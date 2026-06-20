import { useCallback, useRef, useState, useEffect } from "react";

/**
 * Available notification tones - gentle, nursery-friendly sounds
 * Generated using Web Audio API with pleasant frequencies
 */
export type NotificationTone = "soft_chime" | "gentle_bell" | "friendly_ping" | "calm_melody" | "none";

export interface NotificationSoundSettings {
  tone: NotificationTone;
  volume: number; // 0-100
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = "notification_sound_settings";

const DEFAULT_SETTINGS: NotificationSoundSettings = {
  tone: "soft_chime",
  volume: 60,
  vibrationEnabled: true,
  soundEnabled: true,
};

export const TONE_LABELS: Record<NotificationTone, string> = {
  soft_chime: "رنين هادئ",
  gentle_bell: "جرس لطيف",
  friendly_ping: "نغمة ودية",
  calm_melody: "لحن هادئ",
  none: "بدون صوت",
};

function loadSettings(): NotificationSoundSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: NotificationSoundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * Play a soft chime - two gentle sine waves with harmonics
 */
function playSoftChime(ctx: AudioContext, volume: number) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;

  // First chime note - C5 (523 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(523, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.6, now + 0.05);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 1.3);

  // Second chime note - E5 (659 Hz) slightly delayed
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(659, now + 0.15);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.5, now + 0.2);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now + 0.15);
  osc2.stop(now + 1.5);

  // Third note - G5 (784 Hz) for a pleasant major chord feel
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(784, now + 0.3);
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.linearRampToValueAtTime(0.4, now + 0.35);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 1.6);
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.start(now + 0.3);
  osc3.stop(now + 1.7);

  return 1.7; // duration in seconds
}

/**
 * Play a gentle bell - triangle wave with slow decay
 */
function playGentleBell(ctx: AudioContext, volume: number) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;

  // Bell fundamental - A4 (440 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(440, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.5, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 2.1);

  // Bell overtone - slightly detuned for warmth
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(880, now);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now);
  osc2.stop(now + 1.6);

  // Second bell hit after a pause
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = "triangle";
  osc3.frequency.setValueAtTime(523, now + 0.8);
  gain3.gain.setValueAtTime(0, now + 0.8);
  gain3.gain.linearRampToValueAtTime(0.4, now + 0.82);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.start(now + 0.8);
  osc3.stop(now + 2.6);

  return 2.6;
}

/**
 * Play a friendly ping - short, bright, and pleasant
 */
function playFriendlyPing(ctx: AudioContext, volume: number) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;

  // Quick ascending two-note ping
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(587, now); // D5
  osc1.frequency.setValueAtTime(784, now + 0.12); // G5
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.5, now + 0.03);
  gain1.gain.setValueAtTime(0.5, now + 0.1);
  gain1.gain.linearRampToValueAtTime(0.4, now + 0.15);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.9);

  // Soft harmonic layer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1175, now + 0.12); // D6 harmonic
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.15, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.7);

  return 0.9;
}

/**
 * Play a calm melody - gentle 4-note ascending pattern
 */
function playCalmMelody(ctx: AudioContext, volume: number) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;
  const notes = [392, 440, 523, 587]; // G4, A4, C5, D5 - pentatonic feel
  const noteLength = 0.3;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const startTime = now + i * noteLength;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.04);
    gain.gain.setValueAtTime(0.35, startTime + noteLength * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteLength + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + noteLength + 0.35);
  });

  return notes.length * noteLength + 0.35;
}

/**
 * Hook for managing notification sounds with settings persistence
 */
export function useNotificationSound() {
  const [settings, setSettings] = useState<NotificationSoundSettings>(loadSettings);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<NotificationSoundSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((tone: NotificationTone, volume: number): number => {
    if (tone === "none") return 0;
    const ctx = getAudioContext();
    const normalizedVolume = Math.max(0, Math.min(1, volume / 100));

    switch (tone) {
      case "soft_chime":
        return playSoftChime(ctx, normalizedVolume);
      case "gentle_bell":
        return playGentleBell(ctx, normalizedVolume);
      case "friendly_ping":
        return playFriendlyPing(ctx, normalizedVolume);
      case "calm_melody":
        return playCalmMelody(ctx, normalizedVolume);
      default:
        return playSoftChime(ctx, normalizedVolume);
    }
  }, [getAudioContext]);

  /**
   * Play notification sound once based on current settings
   */
  const playOnce = useCallback(() => {
    if (!settings.soundEnabled || settings.tone === "none") return;
    playTone(settings.tone, settings.volume);
  }, [settings, playTone]);

  /**
   * Play notification sound in a repeating loop (for persistent alerts)
   * Repeats every few seconds until stopped
   */
  const playRepeating = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    const doPlay = () => {
      if (!isPlayingRef.current) return;
      if (!settings.soundEnabled || settings.tone === "none") {
        // If sound disabled, just keep checking
        repeatTimeoutRef.current = setTimeout(doPlay, 5000);
        return;
      }
      const duration = playTone(settings.tone, settings.volume);
      // Repeat after the tone finishes + a 3 second pause
      repeatTimeoutRef.current = setTimeout(doPlay, (duration + 3) * 1000);
    };

    doPlay();
  }, [settings, playTone]);

  /**
   * Stop repeating sound
   */
  const stopRepeating = useCallback(() => {
    isPlayingRef.current = false;
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    // Close audio context to stop any playing sounds
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  /**
   * Trigger vibration based on settings
   */
  const vibrate = useCallback(() => {
    if (!settings.vibrationEnabled) return;
    if ("vibrate" in navigator) {
      // Gentle vibration pattern: short-pause-short
      navigator.vibrate([200, 100, 200]);
    }
  }, [settings.vibrationEnabled]);

  /**
   * Preview a specific tone (for settings page)
   */
  const previewTone = useCallback((tone: NotificationTone, volume?: number) => {
    if (tone === "none") return;
    playTone(tone, volume ?? settings.volume);
  }, [playTone, settings.volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return {
    settings,
    updateSettings,
    playOnce,
    playRepeating,
    stopRepeating,
    vibrate,
    previewTone,
  };
}
