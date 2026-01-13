import { useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import anotoMascot from "@/assets/anoto-mascot.png";
interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

interface OrderSuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  orderNumber?: number;
  isSimpleMode?: boolean;
  pointsEarned?: number;
}

export function OrderSuccessAnimation({ isVisible, onComplete, orderNumber, isSimpleMode = false, pointsEarned }: OrderSuccessAnimationProps) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Generate confetti pieces
  const confettiPieces = useMemo<ConfettiPiece[]>(() => {
    const colors = [
      "#f97316", // orange
      "#ef4444", // red
      "#eab308", // yellow
      "#22c55e", // green
      "#3b82f6", // blue
      "#a855f7", // purple
      "#ec4899", // pink
    ];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, []);

  const playKitchenSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Create a "sizzle" sound effect
      const createSizzle = (startTime: number, duration: number) => {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
          // White noise with envelope
          const envelope = Math.exp(-3 * i / bufferSize);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // High-pass filter for sizzle effect
        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 3000;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        noise.connect(highpass);
        highpass.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start(startTime);
        noise.stop(startTime + duration);
      };

      // Create a "ding" bell sound (order ready bell)
      const createBell = (startTime: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(1200, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 0.3);
        
        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
        
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.6);
      };

      // Create a second "ding" for restaurant bell effect
      const createSecondBell = (startTime: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(1400, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, startTime + 0.25);
        
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
        
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      };

      const now = ctx.currentTime;
      
      // Play sizzle first
      createSizzle(now, 0.8);
      
      // Then play bell sounds
      createBell(now + 0.3);
      createSecondBell(now + 0.5);
      
    } catch (error) {
      console.log("Could not play kitchen sound:", error);
    }
  }, []);

  const triggerVibration = useCallback(() => {
    try {
      // Check if vibration API is supported
      if ('vibrate' in navigator) {
        // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms, pause 100ms, vibrate 300ms
        // Creates a "celebration" feeling vibration
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch (error) {
      console.log("Vibration not supported:", error);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      playKitchenSound();
      triggerVibration();
      
      // Auto complete after animation
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, playKitchenSound, triggerVibration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-hidden"
        >
          {/* Confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiPieces.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{ 
                  x: `${piece.x}vw`,
                  y: -20,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  y: "110vh",
                  rotate: piece.rotation + 720,
                  opacity: [1, 1, 0.8, 0]
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  ease: "easeIn"
                }}
                style={{
                  position: "absolute",
                  width: piece.size,
                  height: piece.size * 0.6,
                  backgroundColor: piece.color,
                  borderRadius: piece.size > 10 ? "2px" : "50%",
                }}
              />
            ))}
          </div>

          <div className="text-center space-y-6 relative z-10">
            {/* Mascot Celebration Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 12,
                delay: 0.1 
              }}
              className="relative mx-auto"
            >
              {/* Multi-layer glow effect */}
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 1.2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bg-gradient-to-br from-primary/40 to-orange-500/40 rounded-full blur-3xl"
                style={{ width: 200, height: 200, left: -40, top: -40 }}
              />
              <motion.div
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3
                }}
                className="absolute bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full blur-2xl"
                style={{ width: 160, height: 160, left: -20, top: -20 }}
              />
              
              {/* Mascot with celebration animation */}
              <motion.div className="relative">
                {/* Celebration sparkles around mascot - inner ring */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`spark-${i}`}
                    className="absolute"
                    style={{
                      left: `${50 + 50 * Math.cos((i * 45 * Math.PI) / 180)}%`,
                      top: `${50 + 50 * Math.sin((i * 45 * Math.PI) / 180)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <motion.div
                      className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
                      animate={{
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    />
                  </motion.div>
                ))}

                {/* Outer sparkle ring */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`star-${i}`}
                    className="absolute text-2xl"
                    style={{
                      left: `${50 + 70 * Math.cos((i * 60 * Math.PI) / 180 + 30)}%`,
                      top: `${50 + 70 * Math.sin((i * 60 * Math.PI) / 180 + 30)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    animate={{
                      scale: [0, 1.2, 0],
                      opacity: [0, 1, 0],
                      rotate: [0, 180]
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: 0.5 + i * 0.15
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
                
                {/* Mascot image with celebration jump animation */}
                <motion.img
                  src={anotoMascot}
                  alt="Anotô Mascote Celebrando"
                  className="w-36 h-36 object-contain drop-shadow-2xl relative z-10"
                  animate={{ 
                    y: [0, -25, 0, -15, 0],
                    rotate: [-8, 8, -8, 8, -8],
                    scale: [1, 1.1, 1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
                
                {/* Fire icon with enhanced animation */}
                <motion.div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-full p-2.5 shadow-lg shadow-orange-500/40"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                    y: [0, -3, 0]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Flame className="w-6 h-6 text-white drop-shadow-md" />
                </motion.div>

                {/* Celebration hearts floating up */}
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`heart-${i}`}
                    className="absolute text-lg"
                    style={{ left: `${30 + i * 15}%`, bottom: 0 }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [0, -60, -100, -140],
                      x: [0, (i % 2 === 0 ? 10 : -10), (i % 2 === 0 ? -5 : 5), 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.8 + i * 0.3
                    }}
                  >
                    {i % 2 === 0 ? '❤️' : '🧡'}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <motion.h2 
                className="text-2xl font-bold text-foreground"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {isSimpleMode ? "Pedido Confirmado! ✓" : "Pedido no Forno! 🔥"}
              </motion.h2>
              {orderNumber && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-lg text-muted-foreground"
                >
                  Pedido #{orderNumber}
                </motion.p>
              )}
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-sm text-muted-foreground"
              >
                {isSimpleMode ? "Seu pedido chegará em breve!" : "Preparando com carinho..."}
              </motion.p>
              
              {/* Points Earned Badge */}
              {pointsEarned && pointsEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 1, type: "spring", stiffness: 200 }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full px-4 py-2"
                >
                  <span className="text-amber-500">🎁</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    +{pointsEarned} pontos de fidelidade!
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex justify-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-orange-500 rounded-full"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 0.8, 
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
