import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
const GAME_WIDTH = 240;
const GAME_HEIGHT = 320;
const LANE_WIDTH = GAME_WIDTH / 3;
const PLAYER_SIZE = 36;

interface Obstacle {
  id: number;
  lane: number;
  y: number;
  type: 'car' | 'barrier' | 'cone';
}

interface Coin {
  id: number;
  lane: number;
  y: number;
  collected: boolean;
}

const OBSTACLE_EMOJIS = {
  car: '🚗',
  barrier: '🚧',
  cone: '🔶',
};

interface SubwayGameProps {
  standalone?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  fullscreen?: boolean;
}

export default function SubwayGame({ standalone = false, onClose, onBack, fullscreen = false }: SubwayGameProps) {
  const { playCoin, playHit, playGameOver } = useGameSounds();
  
  // Dynamic dimensions for fullscreen mode
  const gameWidth = fullscreen ? window.innerWidth : 240;
  const gameHeight = fullscreen ? window.innerHeight : 320;
  const laneWidth = gameWidth / 3;
  const playerSize = fullscreen ? 48 : 36;
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('subwayGameHighScore') || '0', 10);
    }
    return 0;
  });
  const [playerLane, setPlayerLane] = useState(1); // 0, 1, 2 (left, center, right)
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [coinItems, setCoinItems] = useState<Coin[]>([]);
  const [speed, setSpeed] = useState(3);
  
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const obstacleIdRef = useRef(0);
  const coinIdRef = useRef(0);
  const touchStartX = useRef<number | null>(null);

  const moveLeft = useCallback(() => {
    if (isPlaying && !gameOver) {
      setPlayerLane(lane => Math.max(0, lane - 1));
    }
  }, [isPlaying, gameOver]);

  const moveRight = useCallback(() => {
    if (isPlaying && !gameOver) {
      setPlayerLane(lane => Math.min(2, lane + 1));
    }
  }, [isPlaying, gameOver]);

  const startGame = useCallback(() => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setCoins(0);
    setPlayerLane(1);
    setObstacles([]);
    setCoinItems([]);
    setSpeed(3);
    obstacleIdRef.current = 0;
    coinIdRef.current = 0;
  }, []);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isPlaying || gameOver) {
      startGame();
      return;
    }

    // Get tap position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    const relativeX = clientX - rect.left;
    const tapLane = Math.floor(relativeX / laneWidth);
    
    if (tapLane < playerLane) {
      moveLeft();
    } else if (tapLane > playerLane) {
      moveRight();
    }
  }, [isPlaying, gameOver, startGame, playerLane, moveLeft, moveRight]);

  // Touch swipe handling - more sensitive for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const diff = touchCurrentX - touchStartX.current;
    
    // More sensitive swipe detection (15px threshold)
    if (Math.abs(diff) > 15) {
      if (diff > 0) {
        moveRight();
      } else {
        moveLeft();
      }
      touchStartX.current = touchCurrentX; // Reset for continuous swipe
    }
  }, [moveLeft, moveRight]);

  const handleTouchEnd = useCallback(() => {
    touchStartX.current = null;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (!isPlaying || gameOver) {
          startGame();
        } else {
          moveLeft();
        }
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        if (!isPlaying || gameOver) {
          startGame();
        } else {
          moveRight();
        }
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPlaying || gameOver) {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, startGame, moveLeft, moveRight]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const spawnRate = 0.02;
    const coinSpawnRate = 0.015;

    gameLoopRef.current = setInterval(() => {
      // Update speed based on score
      setSpeed(s => Math.min(8, 3 + score * 0.002));

      // Update obstacles
      setObstacles(prev => {
        const updated = prev
          .map(o => ({ ...o, y: o.y + speed }))
          .filter(o => o.y < gameHeight + 50);

        // Spawn new obstacle
        if (Math.random() < spawnRate) {
          const types: Obstacle['type'][] = ['car', 'barrier', 'cone'];
          obstacleIdRef.current++;
          updated.push({
            id: obstacleIdRef.current,
            lane: Math.floor(Math.random() * 3),
            y: -40,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }

        return updated;
      });

      // Update coins
      setCoinItems(prev => {
        const updated = prev
          .map(c => ({ ...c, y: c.y + speed }))
          .filter(c => c.y < gameHeight + 30 && !c.collected);

        // Spawn new coin
        if (Math.random() < coinSpawnRate) {
          coinIdRef.current++;
          updated.push({
            id: coinIdRef.current,
            lane: Math.floor(Math.random() * 3),
            y: -30,
            collected: false,
          });
        }

        return updated;
      });

      // Update score
      setScore(s => s + 1);
    }, 1000 / 60);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, gameOver, speed, score]);

  // Collision detection
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const playerX = playerLane * laneWidth + laneWidth / 2;
    const collisionPlayerY = gameHeight - (fullscreen ? 100 : 60);

    // Check coin collection
    for (const coin of coinItems) {
      if (coin.collected) continue;
      
      const coinX = coin.lane * laneWidth + laneWidth / 2;
      const coinY = coin.y;
      
      if (
        coin.lane === playerLane &&
        Math.abs(coinY - collisionPlayerY) < 30
      ) {
        setCoinItems(prev => prev.map(c => 
          c.id === coin.id ? { ...c, collected: true } : c
        ));
        playCoin();
        setCoins(c => c + 1);
        setScore(s => s + 10);
      }
    }

    // Check obstacle collision
    for (const obstacle of obstacles) {
      const obstacleY = obstacle.y;
      
      if (
        obstacle.lane === playerLane &&
        obstacleY > collisionPlayerY - 25 &&
        obstacleY < collisionPlayerY + 25
      ) {
        playHit();
        playGameOver();
        setGameOver(true);
        setIsPlaying(false);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('subwayGameHighScore', score.toString());
        }
        break;
      }
    }
  }, [playerLane, obstacles, coinItems, isPlaying, gameOver, score, highScore, playCoin, playHit, playGameOver]);

  const gameContent = (
    <div className={`relative ${fullscreen ? 'w-full h-full' : ''}`}>
      <div 
        className={`relative overflow-hidden cursor-pointer select-none touch-none ${fullscreen ? 'w-full h-full' : 'mx-auto rounded-lg border border-border/50'}`}
        style={fullscreen 
          ? { width: gameWidth, height: gameHeight, background: 'linear-gradient(to bottom, #374151, #1f2937)' }
          : { width: '100%', maxWidth: gameWidth, height: gameHeight, background: 'linear-gradient(to bottom, #374151, #1f2937)' }
        }
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Lane dividers */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-yellow-400/30"
            style={{ left: laneWidth }}
          />
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-yellow-400/30"
            style={{ left: laneWidth * 2 }}
          />
        </div>

        {/* Moving road lines */}
        {[0, 1, 2].map(lane => (
          <motion.div
            key={lane}
            className="absolute bg-white/20"
            style={{ 
              left: lane * laneWidth + laneWidth / 2 - 2,
              width: fullscreen ? 6 : 4,
              height: fullscreen ? 40 : 20,
            }}
            animate={{ y: [0, gameHeight] }}
            transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
          />
        ))}

        {/* Player */}
        <motion.div
          className={`absolute flex items-center justify-center ${fullscreen ? 'text-4xl' : 'text-2xl'}`}
          style={{ 
            width: playerSize,
            height: playerSize,
            top: gameHeight - (fullscreen ? 100 : 60),
          }}
          animate={{ 
            left: playerLane * laneWidth + (laneWidth - playerSize) / 2,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          🏃
        </motion.div>

        {/* Obstacles */}
        {obstacles.map(obstacle => {
          const obsSize = fullscreen ? 50 : 30;
          return (
            <motion.div
              key={obstacle.id}
              className={`absolute flex items-center justify-center ${fullscreen ? 'text-4xl' : 'text-2xl'}`}
              style={{
                left: obstacle.lane * laneWidth + (laneWidth - obsSize) / 2,
                top: obstacle.y,
                width: obsSize,
                height: obsSize,
              }}
            >
              {OBSTACLE_EMOJIS[obstacle.type]}
            </motion.div>
          );
        })}

        {/* Coins */}
        {coinItems.filter(c => !c.collected).map(coin => {
          const coinSize = fullscreen ? 36 : 24;
          return (
            <motion.div
              key={coin.id}
              className={`absolute flex items-center justify-center ${fullscreen ? 'text-3xl' : 'text-xl'}`}
              style={{
                left: coin.lane * laneWidth + (laneWidth - coinSize) / 2,
                top: coin.y,
                width: coinSize,
                height: coinSize,
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              🪙
            </motion.div>
          );
        })}

        {/* Score & Coins */}
        <div className={`absolute top-4 right-4 font-mono text-white/90 ${fullscreen ? 'text-lg' : 'text-xs'}`}>
          {String(score).padStart(5, '0')}
        </div>
        <div className={`absolute top-4 left-4 font-mono text-yellow-400 ${fullscreen ? 'text-lg' : 'text-xs'}`}>
          🪙 {coins}
        </div>

        {/* High score */}
        {highScore > 0 && isPlaying && (
          <div className={`absolute right-4 font-mono text-white/40 ${fullscreen ? 'top-10 text-sm' : 'top-7 text-[10px]'}`}>
            HI {String(highScore).padStart(5, '0')}
          </div>
        )}

        {/* Start/Game Over overlay */}
        <AnimatePresence>
          {(!isPlaying || gameOver) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <p className={`font-bold text-white mb-2 ${fullscreen ? 'text-2xl' : 'text-base'}`}>
                {gameOver ? '💥 Bateu!' : '🏃 Street Runner'}
              </p>
              <p className={`text-white/80 mb-3 ${fullscreen ? 'text-lg' : 'text-xs'}`}>
                {gameOver ? `Pontos: ${score}` : 'Toque ou deslize'}
              </p>
              {gameOver && coins > 0 && (
                <p className={`text-yellow-400 mb-3 ${fullscreen ? 'text-base' : 'text-xs'}`}>
                  🪙 Moedas: {coins}
                </p>
              )}
              {highScore > 0 && (
                <p className={`text-yellow-300 ${fullscreen ? 'text-base' : 'text-xs'}`}>
                  🏆 Recorde: {highScore}
                </p>
              )}
              {onBack && (
                <button
                  onClick={(e) => { e.stopPropagation(); onBack(); }}
                  className="mt-4 text-sm text-white/60 hover:text-white underline"
                >
                  ← Voltar
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!fullscreen && (
        <p className="text-xs text-muted-foreground/60 text-center mt-2">
          ← → ou toque para mudar de pista
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
      >
        {gameContent}
      </motion.div>
    );
  }

  return <div className="mt-4">{gameContent}</div>;
}
