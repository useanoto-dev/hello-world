import { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import OfflineGame from "@/components/OfflineGame";
import SubwayGame from "@/components/games/SubwayGame";
import FlappyPizzaGame from "@/components/games/FlappyPizzaGame";

type GameType = 'menu' | 'pizza-runner' | 'street-runner' | 'flappy-pizza';

interface GameInfo {
  id: GameType;
  name: string;
  emoji: string;
  description: string;
}

const GAMES: GameInfo[] = [
  { 
    id: 'pizza-runner', 
    name: 'Pizza Runner', 
    emoji: '🍕',
    description: 'Pule os obstáculos!' 
  },
  { 
    id: 'street-runner', 
    name: 'Street Runner', 
    emoji: '🏃',
    description: 'Desvie dos carros!' 
  },
  { 
    id: 'flappy-pizza', 
    name: 'Flappy Pizza', 
    emoji: '🐦',
    description: 'Voe entre os canos!' 
  },
];

// Context to share fullscreen state with parent
export const GameFullscreenContext = createContext<{
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}>({
  isFullscreen: false,
  setIsFullscreen: () => {},
});

export const useGameFullscreen = () => useContext(GameFullscreenContext);

export default function GamesContent() {
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  const { isFullscreen, setIsFullscreen } = useGameFullscreen();

  const handleBack = () => setCurrentGame('menu');

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const exitFullscreen = () => {
    setCurrentGame('menu');
    setIsFullscreen(false);
  };

  const renderGame = (fullscreen: boolean = false) => {
    switch (currentGame) {
      case 'pizza-runner':
        return <OfflineGame standalone={false} fullscreen={fullscreen} />;
      case 'street-runner':
        return <SubwayGame standalone={false} fullscreen={fullscreen} />;
      case 'flappy-pizza':
        return <FlappyPizzaGame standalone={false} fullscreen={fullscreen} />;
      default:
        return null;
    }
  };

  // Fullscreen game view - takes entire screen
  if (isFullscreen && currentGame !== 'menu') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        {/* Minimal header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={exitFullscreen}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-black/40 px-2.5 py-1.5 rounded-full backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
            Sair
          </button>
          <span className="text-xs font-medium text-white/80 bg-black/40 px-2.5 py-1.5 rounded-full backdrop-blur-sm">
            {GAMES.find(g => g.id === currentGame)?.emoji} {GAMES.find(g => g.id === currentGame)?.name}
          </span>
        </div>

        {/* Game fills entire screen */}
        <div className="flex-1 flex items-center justify-center">
          {renderGame(true)}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Gamepad2 className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">Mini Games</h2>
      </div>
      
      <p className="text-sm text-muted-foreground text-center mb-6">
        Divirta-se enquanto espera seu pedido! 🎮
      </p>

      <AnimatePresence mode="wait">
        {currentGame === 'menu' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-3"
          >
            {GAMES.map((game) => (
              <motion.button
                key={game.id}
                onClick={() => setCurrentGame(game.id)}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left w-full"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-4xl">{game.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-base">{game.name}</p>
                  <p className="text-sm text-muted-foreground">{game.description}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={currentGame}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Game controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ← Voltar
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                Tela Cheia
              </Button>
            </div>
            
            {/* Game */}
            <div className="flex justify-center">
              {renderGame()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
