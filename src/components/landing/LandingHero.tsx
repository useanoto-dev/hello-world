// Landing page hero section
import { motion } from "framer-motion";
import { ArrowRight, Check, Shield, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import anotoMascotHero from "@/assets/anoto-mascot-hero.avif";

const COLORS = {
  foreground: "#1D1D1F",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  muted: "#86868B",
  success: "#34C759",
};

interface LandingHeroProps {
  onOpenSignup: () => void;
}

export function LandingHero({ onOpenSignup }: LandingHeroProps) {
  return (
    <section className="pt-28 pb-8 sm:pt-36 sm:pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="text-center sm:text-left order-1"
          >
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span className="text-xs font-medium text-black">#1 em Cardápios Digitais</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-center sm:text-left">
              <span className="block">Seu delivery</span>
              <span 
                className="block text-3xl sm:text-4xl lg:text-5xl" 
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.primary})`, 
                  WebkitBackgroundClip: "text", 
                  WebkitTextFillColor: "transparent" 
                }}
              >
                sem comissão
              </span>
              <span className="block lg:inline">em 3 minutos</span>
            </h1>
            
            <p className="mt-4 text-sm sm:text-base max-w-md mx-auto sm:mx-0 leading-relaxed" style={{ color: COLORS.muted }}>
              Crie seu cardápio digital, receba pedidos via WhatsApp e gerencie tudo em um lugar. 
              <strong className="font-medium" style={{ color: COLORS.foreground }}> Zero taxas.</strong>
            </p>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
              <Button 
                size="lg" 
                onClick={onOpenSignup}
                className="text-sm px-6 py-5 rounded-full shadow-lg"
                style={{ 
                  backgroundColor: COLORS.primary, 
                  color: COLORS.foreground, 
                  fontWeight: 600, 
                  boxShadow: "0 8px 30px rgba(255, 193, 7, 0.35)" 
                }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Começar grátis
              </Button>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              {[
                { icon: Check, text: "7 dias grátis" }, 
                { icon: Shield, text: "Sem cartão" }, 
                { icon: Zap, text: "Setup 3 min" }
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: COLORS.success }} />
                  {item.text}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Mascot */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden sm:flex justify-center items-center order-2"
          >
            <div 
              className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full"
              style={{ 
                background: `radial-gradient(circle, ${COLORS.primary}25 0%, transparent 70%)`, 
                filter: "blur(40px)" 
              }} 
            />
            <motion.img 
              src={anotoMascotHero} 
              alt="Mascote" 
              className="w-48 sm:w-64 lg:w-96 object-contain relative z-10"
              animate={{ y: [0, -6, 0] }} 
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.6 }}
              className="absolute -top-2 right-2 lg:right-6 z-20 px-4 py-2 rounded-xl shadow-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}
            >
              <span className="font-semibold text-sm" style={{ color: COLORS.foreground }}>Pediu, Chegou! 🛵</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
