import { useCallback, useRef, useEffect } from "react";

const NOTIFICATION_SOUND_URL = "/sounds/notification.ogg";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Pre-load audio on mount
  useEffect(() => {
    // Create HTML Audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.preload = "auto";
    audioRef.current.load();

    // Pre-load for Web Audio API fallback
    const preloadWebAudio = async () => {
      try {
        const response = await fetch(NOTIFICATION_SOUND_URL);
        const arrayBuffer = await response.arrayBuffer();
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
        }
      } catch {
        // Web Audio preload failed silently
      }
    };

    preloadWebAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  const playSound = useCallback(async () => {
    // Try HTML Audio first (works best when user has interacted with page)
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      } catch {
        // HTML Audio failed, try Web Audio API
      }
    }

    // Fallback to Web Audio API
    if (audioContextRef.current && audioBufferRef.current) {
      try {
        // Resume context if suspended (browser autoplay policy)
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        return;
      } catch {
        // Web Audio API failed
      }
    }

    // Last resort: generate a beep sound
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant notification chime
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);

      // Cleanup
      setTimeout(() => ctx.close(), 1000);
    } catch {
      // All sound playback methods failed
    }
  }, []);

  return { playSound };
}
