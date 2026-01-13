import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameSounds } from "@/hooks/useGameSounds";
const GAME_WIDTH = 320;
const GAME_HEIGHT = 160;
const GROUND_Y = 130;
const PLAYER_SIZE = 28;
const GRAVITY = 0.7;
const JUMP_FORCE = -11;

interface Obstacle {
  id: number;
  x: number;
  type: 'cactus_small' | 'cactus_large' | 'cactus_double' | 'bird_low' | 'bird_high';
}

interface PowerUp {
  id: number;
  x: number;
  type: 'shield' | 'star' | 'multiplier';
  collected: boolean;
}

// Obstacle config will be generated dynamically based on groundY
const getObstacleConfig = (groundY: number) => ({
  cactus_small: { width: 16, height: 28, y: groundY - 28, emoji: '🌵' },
  cactus_large: { width: 20, height: 36, y: groundY - 36, emoji: '🌴' },
  cactus_double: { width: 32, height: 32, y: groundY - 32, emoji: '🌵🌵' },
  bird_low: { width: 28, height: 20, y: groundY - 45, emoji: '🦅' },
  bird_high: { width: 28, height: 20, y: groundY - 70, emoji: '🐦' },
});

const POWERUP_CONFIG = {
  shield: { emoji: '🛡️', duration: 5000, color: 'text-blue-400' },
  star: { emoji: '⭐', points: 100, color: 'text-yellow-400' },
  multiplier: { emoji: '✨', duration: 8000, multiplier: 2, color: 'text-purple-400' },
};

interface OfflineGameProps {
  standalone?: boolean;
  onClose?: () => void;
  fullscreen?: boolean;
}

export default function OfflineGame({ standalone = false, onClose, fullscreen = false }: OfflineGameProps) {
  const { playJump, playHit, playPowerUp, playMilestone, playGameOver } = useGameSounds();
  
  // For fullscreen: maintain 2:1 aspect ratio but scale up as much as possible
  const getScaledDimensions = () => {
    if (!fullscreen) return { width: 320, height: 160, scale: 1 };
    
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const baseWidth = 320;
    const baseHeight = 160;
    const aspectRatio = baseWidth / baseHeight; // 2:1
    
    // Calculate max size that fits screen while maintaining aspect ratio
    let scaledWidth = screenW * 0.95;
    let scaledHeight = scaledWidth / aspectRatio;
    
    // If height exceeds available space, scale by height instead
    if (scaledHeight > screenH * 0.8) {
      scaledHeight = screenH * 0.8;
      scaledWidth = scaledHeight * aspectRatio;
    }
    
    const scale = scaledWidth / baseWidth;
    return { width: scaledWidth, height: scaledHeight, scale };
  };
  
  const { width: gameWidth, height: gameHeight, scale: gameScale } = getScaledDimensions();
  const groundY = fullscreen ? gameHeight - (30 * gameScale) : 130;
  const playerSize = fullscreen ? 28 * gameScale : 28;
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('offlineGameHighScore') || '0', 10);
    }
    return 0;
  });
  const [playerY, setPlayerY] = useState(groundY - playerSize);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [isJumping, setIsJumping] = useState(false);
  const [isDucking, setIsDucking] = useState(false);
  
  // Power-up states
  const [hasShield, setHasShield] = useState(false);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [showPowerUpText, setShowPowerUpText] = useState<string | null>(null);
  const lastMilestoneRef = useRef(0);
  
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const obstacleIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const velocityRef = useRef(0);
  const shieldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const multiplierTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep velocity in ref for game loop
  useEffect(() => {
    velocityRef.current = velocity;
  }, [velocity]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
      if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
    };
  }, []);

  const activatePowerUp = useCallback((type: PowerUp['type']) => {
    playPowerUp();
    if (type === 'shield') {
      setHasShield(true);
      setShowPowerUpText('🛡️ Escudo!');
      if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
      shieldTimeoutRef.current = setTimeout(() => setHasShield(false), POWERUP_CONFIG.shield.duration);
    } else if (type === 'star') {
      setScore(s => s + POWERUP_CONFIG.star.points);
      setShowPowerUpText('⭐ +100!');
    } else if (type === 'multiplier') {
      setScoreMultiplier(POWERUP_CONFIG.multiplier.multiplier);
      setShowPowerUpText('✨ 2x Pontos!');
      if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
      multiplierTimeoutRef.current = setTimeout(() => setScoreMultiplier(1), POWERUP_CONFIG.multiplier.duration);
    }
    
    setTimeout(() => setShowPowerUpText(null), 1500);
  }, [playPowerUp]);

  const jump = useCallback(() => {
    if (!isJumping && isPlaying && !gameOver) {
      playJump();
      setVelocity(JUMP_FORCE);
      setIsJumping(true);
      setIsDucking(false);
    }
  }, [isJumping, isPlaying, gameOver, playJump]);

  const duck = useCallback((ducking: boolean) => {
    if (isPlaying && !gameOver && !isJumping) {
      setIsDucking(ducking);
    }
  }, [isPlaying, gameOver, isJumping]);

  const startGame = useCallback(() => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setPlayerY(groundY - playerSize);
    setVelocity(0);
    setObstacles([]);
    setPowerUps([]);
    setIsJumping(false);
    setIsDucking(false);
    setHasShield(false);
    setScoreMultiplier(1);
    obstacleIdRef.current = 0;
    powerUpIdRef.current = 0;
    lastMilestoneRef.current = 0;
    if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
    if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
  }, []);

  const handleInteraction = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    if (!isPlaying || gameOver) {
      startGame();
    } else {
      jump();
    }
  }, [isPlaying, gameOver, startGame, jump]);

  // Get random obstacle type based on score
  const getRandomObstacleType = useCallback((): Obstacle['type'] => {
    const types: Obstacle['type'][] = ['cactus_small', 'cactus_large'];
    if (score > 200) types.push('cactus_double');
    if (score > 400) types.push('bird_low');
    if (score > 600) types.push('bird_high');
    return types[Math.floor(Math.random() * types.length)];
  }, [score]);

  // Get random power-up type
  const getRandomPowerUpType = useCallback((): PowerUp['type'] => {
    const types: PowerUp['type'][] = ['shield', 'star', 'multiplier'];
    return types[Math.floor(Math.random() * types.length)];
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameSpeed = Math.min(4 + score * 0.003, 10);
    const spawnRate = Math.max(0.015, 0.025 - score * 0.00002);
    const powerUpSpawnRate = 0.003; // Rare power-up spawn

    gameLoopRef.current = setInterval(() => {
      // Update player position
      setVelocity(v => {
        const newV = v + GRAVITY;
        velocityRef.current = newV;
        return newV;
      });
      
      setPlayerY(y => {
        const newY = y + velocityRef.current;
        if (newY >= groundY - playerSize) {
          setIsJumping(false);
          setVelocity(0);
          return groundY - playerSize;
        }
        return newY;
      });

      // Update obstacles
      setObstacles(prev => {
        const updated = prev
          .map(o => ({ ...o, x: o.x - gameSpeed }))
          .filter(o => o.x > -40);

        const lastObstacle = updated[updated.length - 1];
        const minDistance = 120 + Math.random() * 80;
        
        if (Math.random() < spawnRate && (!lastObstacle || lastObstacle.x < gameWidth - minDistance)) {
          obstacleIdRef.current++;
          updated.push({ 
            id: obstacleIdRef.current, 
            x: gameWidth + 20,
            type: getRandomObstacleType()
          });
        }

        return updated;
      });

      // Update power-ups
      setPowerUps(prev => {
        const updated = prev
          .map(p => ({ ...p, x: p.x - gameSpeed }))
          .filter(p => p.x > -30 && !p.collected);

        // Spawn new power-up (rare)
        if (Math.random() < powerUpSpawnRate && updated.length === 0) {
          powerUpIdRef.current++;
          updated.push({
            id: powerUpIdRef.current,
            x: gameWidth + 20,
            type: getRandomPowerUpType(),
            collected: false,
          });
        }

        return updated;
      });

      // Update score with multiplier and check milestones
      setScore(s => {
        const newScore = s + scoreMultiplier;
        const milestones = [100, 500, 1000, 2000, 5000];
        for (const milestone of milestones) {
          if (newScore >= milestone && lastMilestoneRef.current < milestone) {
            lastMilestoneRef.current = milestone;
            playMilestone();
            break;
          }
        }
        return newScore;
      });
    }, 1000 / 60);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, gameOver, score, scoreMultiplier, getRandomObstacleType, getRandomPowerUpType, playMilestone]);

  // Collision detection
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const collisionPlayerSize = fullscreen ? 28 * gameScale : 28;
    const collisionPlayerLeft = fullscreen ? 30 * gameScale : 30;
    const playerHeight = isDucking ? collisionPlayerSize * 0.6 : collisionPlayerSize;
    const playerLeft = collisionPlayerLeft;
    const playerRight = playerLeft + collisionPlayerSize - 4;
    const playerTop = isDucking ? playerY + collisionPlayerSize * 0.4 : playerY;
    const playerBottom = playerY + collisionPlayerSize;

    // Check power-up collection
    for (const powerUp of powerUps) {
      if (powerUp.collected) continue;
      
      const powerUpLeft = powerUp.x;
      const powerUpRight = powerUp.x + (fullscreen ? 24 * gameScale : 24);
      const powerUpY = groundY - (fullscreen ? 50 * gameScale : 50);
      
      if (
        playerRight > powerUpLeft &&
        playerLeft < powerUpRight &&
        playerBottom > powerUpY &&
        playerTop < powerUpY + (fullscreen ? 24 * gameScale : 24)
      ) {
        setPowerUps(prev => prev.map(p => 
          p.id === powerUp.id ? { ...p, collected: true } : p
        ));
        activatePowerUp(powerUp.type);
      }
    }

    // Check obstacle collision (skip if has shield)
    if (!hasShield) {
      for (const obstacle of obstacles) {
        const config = getObstacleConfig(groundY)[obstacle.type];
        const obstacleLeft = obstacle.x + 4;
        const obstacleRight = obstacle.x + config.width - 4;
        const obstacleTop = config.y;
        const obstacleBottom = config.y + config.height;

        if (
          playerRight > obstacleLeft &&
          playerLeft < obstacleRight &&
          playerBottom > obstacleTop &&
          playerTop < obstacleBottom
        ) {
          playHit();
          playGameOver();
          setGameOver(true);
          setIsPlaying(false);
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('offlineGameHighScore', score.toString());
          }
          break;
        }
      }
    }
  }, [playerY, obstacles, powerUps, isPlaying, gameOver, score, highScore, isDucking, hasShield, activatePowerUp, playHit, playGameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInteraction();
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        duck(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleInteraction, duck]);

  const gameContent = (
    <div className={`relative ${fullscreen ? 'w-full h-full flex items-center justify-center' : ''}`}>
      <div 
        className={`relative overflow-hidden cursor-pointer select-none touch-none ${fullscreen ? 'rounded-lg shadow-2xl' : 'mx-auto rounded-lg border border-border/50 bg-card/50'}`}
        style={{ width: gameWidth, height: gameHeight, background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F0FF 100%)' }}
        onClick={handleInteraction}
        onTouchStart={(e) => {
          e.preventDefault();
          handleInteraction();
        }}
        onTouchEnd={(e) => e.preventDefault()}
      >
        {/* Background clouds */}
        <div className="absolute top-3 left-8 text-lg opacity-20">☁️</div>
        <div className="absolute top-6 right-12 text-sm opacity-15">☁️</div>
        <div className="absolute top-2 right-24 text-xs opacity-10">☁️</div>

        {/* Ground */}
        <div 
          className="absolute left-0 right-0 border-t-2 border-dashed border-muted-foreground/30"
          style={{ top: groundY }}
        />

        {/* Ground decoration */}
        <div className="absolute left-0 right-0 flex gap-4 opacity-30" style={{ top: groundY + 2, fontSize: fullscreen ? `${8 * gameScale}px` : '8px' }}>
          {Array.from({ length: fullscreen ? Math.floor(gameWidth / 20) : 15 }).map((_, i) => (
            <span key={i}>.</span>
          ))}
        </div>

        {/* Player with shield effect */}
        <motion.div
          className="absolute flex items-center justify-center"
          style={{ 
            left: fullscreen ? 30 * gameScale : 30, 
            top: playerY,
            width: playerSize,
            height: isDucking ? playerSize * 0.6 : playerSize,
            fontSize: fullscreen ? `${(isDucking ? 18 : 24) * gameScale}px` : (isDucking ? '18px' : '24px'),
          }}
          animate={{ 
            rotate: isJumping ? -20 : 0,
            scaleY: isDucking ? 0.6 : 1,
          }}
        >
          {hasShield && (
            <motion.div
              className="absolute inset-[-6px] rounded-full border-2 border-blue-400/60 bg-blue-400/10"
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
          🍕
        </motion.div>

        {/* Obstacles */}
        {obstacles.map(obstacle => {
          const config = getObstacleConfig(groundY)[obstacle.type];
          const isBird = obstacle.type.startsWith('bird');
          
          return (
            <motion.div
              key={obstacle.id}
              className="absolute flex items-end justify-center"
              style={{
                left: obstacle.x,
                top: config.y,
                width: config.width,
                height: config.height,
                fontSize: obstacle.type === 'cactus_double' ? '16px' : isBird ? '20px' : '24px',
              }}
              animate={isBird ? { y: [0, -5, 0] } : {}}
              transition={isBird ? { repeat: Infinity, duration: 0.3 } : {}}
            >
              {config.emoji}
            </motion.div>
          );
        })}

        {/* Power-ups */}
        {powerUps.filter(p => !p.collected).map(powerUp => {
          const config = POWERUP_CONFIG[powerUp.type];
          
          return (
            <motion.div
              key={powerUp.id}
              className={`absolute flex items-center justify-center ${config.color}`}
              style={{
                left: powerUp.x,
                top: groundY - (fullscreen ? 50 * gameScale : 50),
                width: fullscreen ? 24 * gameScale : 24,
                height: fullscreen ? 24 * gameScale : 24,
                fontSize: fullscreen ? `${20 * gameScale}px` : '20px',
              }}
              animate={{ 
                y: [0, -4, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              {config.emoji}
            </motion.div>
          );
        })}

        {/* Power-up notification */}
        <AnimatePresence>
          {showPowerUpText && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 text-sm font-bold text-primary bg-background/80 px-2 py-1 rounded"
            >
              {showPowerUpText}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active power-ups indicator */}
        {isPlaying && (hasShield || scoreMultiplier > 1) && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {hasShield && (
              <motion.span 
                className="text-xs"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                🛡️
              </motion.span>
            )}
            {scoreMultiplier > 1 && (
              <motion.span 
                className="text-xs"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                ✨2x
              </motion.span>
            )}
          </div>
        )}

        {/* Score */}
        <div className={`absolute top-4 right-4 font-mono ${fullscreen ? 'text-lg text-white drop-shadow-lg' : 'text-xs text-muted-foreground'}`}>
          {scoreMultiplier > 1 && <span className="text-purple-400">x2 </span>}
          {String(score).padStart(5, '0')}
        </div>

        {/* High score indicator */}
        {highScore > 0 && isPlaying && (
          <div className={`absolute top-4 left-4 font-mono ${fullscreen ? 'text-sm text-white/60 drop-shadow' : 'text-[10px] text-muted-foreground/50'}`}>
            HI {String(highScore).padStart(5, '0')}
          </div>
        )}

        {/* Start/Game Over overlay */}
        {(!isPlaying || gameOver) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <p className={`font-bold mb-2 ${fullscreen ? 'text-2xl text-white drop-shadow-lg' : 'text-sm text-foreground'}`}>
              {gameOver ? '💥 Game Over!' : '🍕 Pizza Runner'}
            </p>
            <p className={`mb-3 ${fullscreen ? 'text-lg text-white/90' : 'text-xs text-muted-foreground'}`}>
              {gameOver ? `Pontos: ${score}` : 'Toque para jogar'}
            </p>
            {highScore > 0 && (
              <p className={fullscreen ? 'text-base text-yellow-400' : 'text-xs text-primary'}>
                🏆 Recorde: {highScore}
              </p>
            )}
            {!gameOver && (
              <p className={`mt-3 ${fullscreen ? 'text-sm text-white/60' : 'text-[10px] text-muted-foreground/60'}`}>
                🛡️ ⭐ ✨ Colete power-ups!
              </p>
            )}
          </div>
        )}
      </div>

      {!fullscreen && (
        <p className="text-xs text-muted-foreground/60 text-center mt-2">
          Toque/Espaço = pular • Seta ↓ = abaixar
        </p>
      )}
    </div>
  );

  if (standalone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Jogue enquanto espera!</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
              Fechar
            </Button>
          )}
        </div>
        {gameContent}
      </motion.div>
    );
  }

  return <div className="mt-6">{gameContent}</div>;
}
