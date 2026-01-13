import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Flavor {
  id: string;
  name: string;
  description?: string | null;
  flavor_type: string;
}

interface SrPizzaButtonProps {
  flavors: Flavor[];
  onFlavorSelect: (flavor: Flavor) => void;
}

export function SrPizzaButton({ flavors, onFlavorSelect }: SrPizzaButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentFlavor, setCurrentFlavor] = useState<Flavor | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null);

  const startSelection = () => {
    if (flavors.length === 0) return;
    
    setIsSpinning(true);
    setSelectedFlavor(null);
    
    const spinDuration = 3000;
    const intervalTime = 100;
    const iterations = spinDuration / intervalTime;
    
    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * flavors.length);
      setCurrentFlavor(flavors[randomIndex]);
      count++;
      
      if (count >= iterations) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * flavors.length);
        const finalFlavor = flavors[finalIndex];
        setCurrentFlavor(finalFlavor);
        setSelectedFlavor(finalFlavor);
        setIsSpinning(false);
      }
    }, intervalTime);
  };

  const handleConfirm = () => {
    if (selectedFlavor) {
      onFlavorSelect(selectedFlavor);
      handleClose();
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setCurrentFlavor(null);
    setSelectedFlavor(null);
    setIsSpinning(false);
  };

  return (
    <>
      {/* Sr Pizza Floating Card */}
      <div className="mb-4">
        <motion.button
          onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-2xl shadow-lg overflow-hidden relative group"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Sparkles floating */}
          <motion.div
            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-2 right-4"
          >
            <Sparkles className="w-5 h-5 text-yellow-200" />
          </motion.div>

          <div className="relative flex items-center gap-3 p-3">
            {/* Sr Pizza Image */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-3xl">🍕</span>
            </div>

            {/* Text Content */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🍕</span>
                <span className="text-white font-bold text-sm">
                  Sr. Pizza
                </span>
              </div>
              <p className="text-white/90 text-xs">
                Indeciso? Deixe-me escolher pra você!
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] text-white font-medium">
                👆 Clique aqui!
              </span>
            </div>

            {/* Arrow indicator */}
            <div className="flex-shrink-0">
              <ChevronRight className="w-5 h-5 text-white/80" />
            </div>
          </div>

          {/* Pulse effect */}
          <div className="absolute inset-0 bg-white/10 animate-pulse" />
        </motion.button>
      </div>

      {/* Modal ROXO MISTERIOSO */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-2xl p-5 max-w-sm w-full shadow-2xl border-4 border-purple-500 relative overflow-hidden"
            >
              {/* Efeito de brilho misterioso roxo na borda */}
              <div className="absolute inset-0 rounded-2xl border-2 border-purple-300/50 animate-pulse pointer-events-none" />

              {/* Partículas flutuantes misteriosas roxas */}
              <motion.div 
                animate={{ y: [0, -10, 0], x: [0, 5, 0], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-4 right-8"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
              </motion.div>
              <motion.div 
                animate={{ y: [0, 8, 0], x: [0, -3, 0], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-16 left-6"
              >
                <Sparkles className="w-3 h-3 text-pink-400" />
              </motion.div>
              <motion.div 
                animate={{ y: [0, -6, 0], x: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute top-20 left-4"
              >
                <Sparkles className="w-3 h-3 text-purple-300" />
              </motion.div>

              {/* Close button roxo */}
              <button 
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors z-10"
              >
                <X className="w-4 h-4 text-purple-600" />
              </button>

              {/* Content */}
              <div className="relative z-10">
                {/* Header com Sr Pizza Image */}
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mb-2 shadow-lg">
                    <span className="text-4xl">🍕</span>
                  </div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Sr. Pizza
                  </h3>
                  <p className="text-xs text-purple-600/80 mt-1">
                    ✨ Deixe a magia escolher o sabor perfeito! ✨
                  </p>
                </div>

                {/* Flavor Display */}
                <div className="mb-4">
                  <motion.div
                    animate={isSpinning ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3, repeat: isSpinning ? Infinity : 0 }}
                    className="min-h-[100px] bg-white rounded-xl border-2 border-purple-200 p-4 flex items-center justify-center shadow-inner"
                  >
                    {!currentFlavor ? (
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-4xl mb-2"
                        >
                          🔮
                        </motion.div>
                        <p className="text-sm text-purple-500">Clique no botão mágico abaixo!</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-3xl">
                          {currentFlavor.flavor_type === 'doce' ? '🍰' : '🍕'}
                        </span>
                        <h4 className="font-bold text-lg text-gray-900 mt-2">
                          {currentFlavor.name}
                        </h4>
                        {currentFlavor.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {currentFlavor.description}
                          </p>
                        )}
                        {selectedFlavor && (
                          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-purple-600 font-medium">
                            <span>✨</span>
                            Escolha Mágica do Sr. Pizza!
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {!selectedFlavor ? (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={startSelection}
                        disabled={isSpinning || flavors.length === 0}
                        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl relative overflow-hidden"
                      >
                        {/* Efeito de brilho animado no botão roxo */}
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                        <span className="relative flex items-center justify-center gap-2">
                          {isSpinning ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Escolhendo magicamente...
                            </>
                          ) : (
                            <>
                              <motion.span
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkles className="w-5 h-5" />
                              </motion.span>
                              Escolher Sabor Mágico
                            </>
                          )}
                        </span>
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <Button
                        onClick={handleConfirm}
                        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl"
                      >
                        <span className="mr-2">🎉</span>
                        Adicionar este Sabor
                      </Button>
                      <Button
                        onClick={startSelection}
                        variant="outline"
                        className="w-full h-10 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl"
                      >
                        🔄 Tentar Outro Sabor
                      </Button>
                    </>
                  )}
                </div>

                {/* Mensagem mística */}
                <p className="text-center text-[10px] text-purple-400 mt-3">
                  🔮 A magia do Sr. Pizza nunca falha!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
