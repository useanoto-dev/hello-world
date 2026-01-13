import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import anotoMascot from "@/assets/anoto-mascot.png";

export default function EmptyCart() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/menu")}
            className="rounded-lg w-8 h-8"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Carrinho</h1>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Mascot with wobble animation */}
          <motion.div className="relative mx-auto mb-4 w-32 h-32">
            {/* Subtle glow */}
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Mascot with wobble */}
            <motion.img
              src={anotoMascot}
              alt="Carrinho vazio"
              className="w-32 h-32 object-contain relative z-10 drop-shadow-lg"
              animate={{ 
                rotate: [-8, 8, -8, 8, -8],
                y: [0, -5, 0, -3, 0],
                scale: [1, 1.02, 1, 1.01, 1]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
            {/* Question marks floating */}
            {['❓', '🛒', '❓'].map((emoji, i) => (
              <motion.span
                key={i}
                className="absolute text-lg"
                style={{
                  left: `${20 + i * 30}%`,
                  top: '-10%'
                }}
                animate={{
                  y: [0, -15, 0],
                  opacity: [0.5, 1, 0.5],
                  rotate: [0, 10, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            Carrinho vazio
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Explore nosso cardápio e adicione sabores incríveis
          </p>
          
          <Button
            onClick={() => navigate("/menu")}
            className="gradient-red text-white rounded-xl h-12 px-6"
          >
            Ver Cardápio
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
