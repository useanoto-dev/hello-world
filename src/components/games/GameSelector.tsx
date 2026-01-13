import { useState } from "react";
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

interface GameSelectorProps {
  standalone?: boolean;
  onClose?: () => void;
}

export default function GameSelector({ standalone = false, onClose }: GameSelectorProps) {
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleBack = () => setCurrentGame('menu');

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

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

  // Fullscreen game view
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

  const content = (
    <AnimatePresence mode="wait">
      {currentGame === 'menu' ? (
        <motion.div
          key="menu"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground text-center mb-4">
            Escolha um jogo para se divertir!
          </p>
          
          <div className="grid gap-2">
            {GAMES.map((game) => (
              <motion.button
                key={game.id}
                onClick={() => setCurrentGame(game.id)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors text-left w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">{game.emoji}</span>
                <div>
                  <p className="font-medium text-sm">{game.name}</p>
                  <p className="text-xs text-muted-foreground">{game.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={currentGame}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-3"
        >
          {/* Game controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Voltar
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2 h-7 text-xs"
            >
              <Maximize2 className="w-3 h-3" />
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
  );

  if (standalone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Mini Games</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
              Fechar
            </Button>
          )}
        </div>
        {content}
      </motion.div>
    );
  }

  return <div className="mt-6">{content}</div>;
}
