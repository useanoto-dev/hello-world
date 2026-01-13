import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";

interface FlappyPizzaGameProps {
  standalone?: boolean;
  fullscreen?: boolean;
}

interface Pipe {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
}

const GAME_WIDTH = 300;
const GAME_HEIGHT = 380;
const PIZZA_SIZE = 36;
const PIPE_WIDTH = 55;
const PIPE_GAP = 130;
const GRAVITY = 0.45;
const JUMP_FORCE = -7.5;
const PIPE_SPEED = 2.8;

export default function FlappyPizzaGame({ standalone = false, fullscreen = false }: FlappyPizzaGameProps) {
  const { playJump, playScore, playHit, playGameOver } = useGameSounds();
  
  // Dynamic dimensions for fullscreen mode
  const gameWidth = fullscreen ? window.innerWidth : 300;
  const gameHeight = fullscreen ? window.innerHeight : 380;
  const pizzaSize = fullscreen ? 48 : 36;
  const pipeWidth = fullscreen ? 70 : 55;
  const pipeGap = fullscreen ? 160 : 130;
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [pizzaY, setPizzaY] = useState(gameHeight / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyPizzaHighScore');
    return saved ? parseInt(saved) : 0;
  });
  
  const gameLoopRef = useRef<number>();
  const pipeIdRef = useRef(0);

  const jump = useCallback(() => {
    if (gameState === 'idle') {
      setGameState('playing');
      setVelocity(JUMP_FORCE);
      playJump();
    } else if (gameState === 'playing') {
      setVelocity(JUMP_FORCE);
      playJump();
    } else if (gameState === 'gameOver') {
      // Reset game
      setPizzaY(gameHeight / 2);
      setVelocity(0);
      setPipes([]);
      setScore(0);
      pipeIdRef.current = 0;
      setGameState('idle');
    }
  }, [gameState, playJump]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      // Update pizza position
      setVelocity(v => v + GRAVITY);
      setPizzaY(y => {
        const newY = y + velocity;
        
        // Check floor/ceiling collision
        if (newY < 0 || newY > gameHeight - pizzaSize) {
          playHit();
          playGameOver();
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('flappyPizzaHighScore', score.toString());
          }
          return y;
        }
        
        return newY;
      });

      // Update pipes
      setPipes(currentPipes => {
        let newPipes = currentPipes
          .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
          .filter(pipe => pipe.x > -pipeWidth);

        // Add new pipe
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < gameWidth - 200) {
          const gapY = Math.random() * (gameHeight - pipeGap - 100) + 50;
          newPipes.push({
            id: pipeIdRef.current++,
            x: gameWidth,
            gapY,
            passed: false
          });
        }

        // Check collisions and scoring
        const pizzaLeft = fullscreen ? 80 : 50;
        const pizzaRight = pizzaLeft + pizzaSize;
        const pizzaTop = pizzaY;
        const pizzaBottom = pizzaY + pizzaSize;

        newPipes = newPipes.map(pipe => {
          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + pipeWidth;

          // Check collision
          if (pizzaRight > pipeLeft && pizzaLeft < pipeRight) {
            const inGap = pizzaTop > pipe.gapY && pizzaBottom < pipe.gapY + pipeGap;
            if (!inGap) {
              playHit();
              playGameOver();
              setGameState('gameOver');
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem('flappyPizzaHighScore', score.toString());
              }
            }
          }

          // Check if passed
          if (!pipe.passed && pipe.x + pipeWidth < pizzaLeft) {
            playScore();
            setScore(s => s + 1);
            return { ...pipe, passed: true };
          }

          return pipe;
        });

        return newPipes;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, velocity, pizzaY, score, highScore, playHit, playGameOver, playScore]);

  return (
    <div className={standalone ? "" : fullscreen ? "w-full h-full" : "mt-2"}>
      {!fullscreen && (
        <div className="text-center mb-2">
          <span className="text-xs text-muted-foreground">
            Toque ou Espaço para voar
          </span>
        </div>
      )}
      
      {/* Game container */}
      <div 
        className={`relative overflow-hidden cursor-pointer select-none touch-none ${fullscreen ? 'w-full h-full' : 'mx-auto rounded-lg'}`}
        style={fullscreen
          ? { width: gameWidth, height: gameHeight, background: 'linear-gradient(to bottom, #87CEEB 0%, #98D8E8 50%, #90EE90 95%, #228B22 100%)' }
          : { width: '100%', maxWidth: gameWidth, height: gameHeight, background: 'linear-gradient(to bottom, #87CEEB 0%, #98D8E8 50%, #90EE90 95%, #228B22 100%)' }
        }
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
        onTouchEnd={(e) => e.preventDefault()}
      >
        {/* Clouds */}
        <div className={`absolute opacity-80 ${fullscreen ? 'top-16 left-16 text-6xl' : 'top-8 left-10 text-4xl'}`}>☁️</div>
        <div className={`absolute opacity-70 ${fullscreen ? 'top-28 right-16 text-5xl' : 'top-16 right-8 text-3xl'}`}>☁️</div>
        <div className={`absolute opacity-60 ${fullscreen ? 'top-44 left-1/2 text-4xl' : 'top-28 left-1/2 text-2xl'}`}>☁️</div>
        
        {/* Pipes */}
        {pipes.map(pipe => (
          <div key={pipe.id}>
            {/* Top pipe */}
            <div
              className="absolute"
              style={{
                left: pipe.x,
                top: 0,
                width: pipeWidth,
                height: pipe.gapY,
              }}
            >
              <div 
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(to right, #2d5a27, #4a8b3c, #3d7a32)',
                  borderBottom: '4px solid #1a3a15',
                  borderRadius: '0 0 4px 4px'
                }}
              />
              {/* Pipe cap */}
              <div 
                className="absolute -bottom-3 -left-1"
                style={{
                  width: pipeWidth + 8,
                  height: fullscreen ? 20 : 16,
                  background: 'linear-gradient(to right, #2d5a27, #5a9b4c, #3d7a32)',
                  borderRadius: '4px',
                  border: '2px solid #1a3a15'
                }}
              />
            </div>
            
            {/* Bottom pipe */}
            <div
              className="absolute"
              style={{
                left: pipe.x,
                top: pipe.gapY + pipeGap,
                width: pipeWidth,
                height: gameHeight - pipe.gapY - pipeGap,
              }}
            >
              {/* Pipe cap */}
              <div 
                className="absolute -top-3 -left-1"
                style={{
                  width: pipeWidth + 8,
                  height: fullscreen ? 20 : 16,
                  background: 'linear-gradient(to right, #2d5a27, #5a9b4c, #3d7a32)',
                  borderRadius: '4px',
                  border: '2px solid #1a3a15'
                }}
              />
              <div 
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(to right, #2d5a27, #4a8b3c, #3d7a32)',
                  borderTop: '4px solid #1a3a15',
                  borderRadius: '4px 4px 0 0'
                }}
              />
            </div>
          </div>
        ))}
        
        {/* Pizza (player) */}
        <motion.div
          className={`absolute ${fullscreen ? 'text-5xl' : 'text-3xl'}`}
          style={{
            left: fullscreen ? 80 : 50,
            top: pizzaY,
            width: pizzaSize,
            height: pizzaSize,
          }}
          animate={{
            rotate: Math.min(Math.max(velocity * 3, -30), 90)
          }}
          transition={{ duration: 0.1 }}
        >
          🍕
        </motion.div>
        
        {/* Score */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <span 
            className={`font-bold ${fullscreen ? 'text-6xl' : 'text-4xl'}`}
            style={{
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5), -1px -1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {score}
          </span>
        </div>
        
        {/* Game states */}
        {gameState === 'idle' && (
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className={fullscreen ? 'text-7xl mb-6' : 'text-5xl mb-4'}>🍕</span>
            <p className={`text-white font-bold drop-shadow-lg ${fullscreen ? 'text-3xl' : 'text-lg'}`}>Flappy Pizza</p>
            <p className={`text-white/90 mt-3 drop-shadow ${fullscreen ? 'text-lg' : 'text-sm'}`}>Toque para começar!</p>
            {highScore > 0 && (
              <p className={`text-yellow-300 mt-4 drop-shadow ${fullscreen ? 'text-base' : 'text-xs'}`}>
                🏆 Recorde: {highScore}
              </p>
            )}
          </motion.div>
        )}
        
        {gameState === 'gameOver' && (
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className={`text-white font-bold drop-shadow-lg ${fullscreen ? 'text-3xl' : 'text-xl'}`}>Game Over!</p>
            <p className={`text-white mt-3 drop-shadow ${fullscreen ? 'text-3xl' : 'text-2xl'}`}>
              Pontos: {score}
            </p>
            {score >= highScore && score > 0 && (
              <motion.p 
                className={`text-yellow-300 mt-3 ${fullscreen ? 'text-lg' : 'text-sm'}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                🎉 Novo Recorde!
              </motion.p>
            )}
            <p className={`text-white/80 mt-5 drop-shadow ${fullscreen ? 'text-base' : 'text-sm'}`}>
              Toque para jogar novamente
            </p>
          </motion.div>
        )}
      </div>
      
      {/* High score display - only show when not fullscreen */}
      {!fullscreen && (
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            🏆 Recorde: {highScore}
          </span>
        </div>
      )}
    </div>
  );
}
