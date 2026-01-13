import { useCallback, useRef } from 'react';

// Create sounds using Web Audio API - no external files needed
export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not available
    }
  }, [getAudioContext]);

  const playJump = useCallback(() => {
    playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(600, 0.1, 'sine', 0.15), 50);
  }, [playTone]);

  const playScore = useCallback(() => {
    playTone(523, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.25), 200);
  }, [playTone]);

  const playCoin = useCallback(() => {
    playTone(988, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(1319, 0.12, 'sine', 0.2), 80);
  }, [playTone]);

  const playHit = useCallback(() => {
    playTone(200, 0.15, 'sawtooth', 0.3);
    setTimeout(() => playTone(100, 0.2, 'sawtooth', 0.25), 100);
  }, [playTone]);

  const playPowerUp = useCallback(() => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'sine', 0.2), i * 80);
    });
  }, [playTone]);

  const playGameOver = useCallback(() => {
    playTone(392, 0.2, 'triangle', 0.3);
    setTimeout(() => playTone(330, 0.2, 'triangle', 0.25), 200);
    setTimeout(() => playTone(262, 0.4, 'triangle', 0.3), 400);
  }, [playTone]);

  const playMilestone = useCallback(() => {
    // Play a fanfare for milestones (100, 500, 1000 points)
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.12, 'sine', 0.2), i * 60);
    });
  }, [playTone]);

  return {
    playJump,
    playScore,
    playCoin,
    playHit,
    playPowerUp,
    playGameOver,
    playMilestone,
  };
}
