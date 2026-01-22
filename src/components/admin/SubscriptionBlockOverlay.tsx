import { LogOut, CreditCard, Rocket, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import anotoLogo from "@/assets/anoto-logo-full.png";

interface SubscriptionBlockOverlayProps {
  isTrialExpired: boolean;
  onGoToSubscription: () => void;
  onLogout: () => void;
}

export function SubscriptionBlockOverlay({
  isTrialExpired,
  onGoToSubscription,
  onLogout,
}: SubscriptionBlockOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-md w-full mx-4 text-center"
      >
        {/* Logo */}
        <motion.img
          src={anotoLogo}
          alt="Anotô"
          className="h-16 mx-auto mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        />

        {/* Rocket Icon */}
        <motion.div 
          className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Rocket className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isTrialExpired ? "Hora de Decolar! 🚀" : "Vamos Reativar?"}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {isTrialExpired
            ? "Você explorou o Anotô e viu como ele pode transformar seu negócio! Agora é hora de ativar seu plano e continuar crescendo com a gente."
            : "Sentimos sua falta! Reative sua assinatura e continue aproveitando tudo que o Anotô tem a oferecer para seu estabelecimento."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={onGoToSubscription}
            className="w-full gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <CreditCard className="w-5 h-5" />
            Ativar Meu Plano
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onLogout}
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </Button>
        </div>

        {/* Social Links */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href="https://instagram.com/useanoto"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="w-4 h-4" />
            @useanoto
          </a>
          
          <p className="text-xs text-muted-foreground">
            Dúvidas? Fale com a gente pelo{" "}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
