import { useCallback, useRef } from "react";

type OrderType = "delivery" | "pickup" | "dine_in";

// Sound configurations for each order type
const soundConfigs: Record<OrderType, { frequencies: number[]; duration: number; volume: number }> = {
  delivery: {
    // Truck/delivery sound - lower tones, beep-beep pattern
    frequencies: [523.25, 659.25, 783.99], // C5, E5, G5
    duration: 0.6,
    volume: 0.35,
  },
  pickup: {
    // Store pickup - bright, quick bell sound
    frequencies: [880, 1108.73, 880], // A5, C#6, A5
    duration: 0.4,
    volume: 0.3,
  },
  dine_in: {
    // Table/dine-in - elegant restaurant chime
    frequencies: [698.46, 880, 1046.50, 1318.51], // F5, A5, C6, E6
    duration: 0.7,
    volume: 0.25,
  },
};

export function useOrderTypeSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playOrderSound = useCallback((orderType: string) => {
    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const type = (orderType === "delivery" || orderType === "pickup" || orderType === "dine_in") 
        ? orderType 
        : "delivery";
      
      const config = soundConfigs[type];
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Set up frequency progression
      const stepDuration = config.duration / config.frequencies.length;
      config.frequencies.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + (index * stepDuration));
      });

      // Volume envelope
      gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);

      // Play second chime for delivery (double beep pattern)
      if (type === "delivery") {
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          
          config.frequencies.forEach((freq, index) => {
            osc2.frequency.setValueAtTime(freq, ctx.currentTime + (index * stepDuration));
          });
          
          gain2.gain.setValueAtTime(config.volume, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);
          
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + config.duration);
        }, 300);
      }
    } catch (error) {
      console.log("Could not play order sound:", error);
    }
  }, []);

  return { playOrderSound };
}
