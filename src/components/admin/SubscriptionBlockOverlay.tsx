import { Lock, LogOut, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full mx-4 text-center"
      >
        {/* Lock Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isTrialExpired ? "Período de Teste Expirado" : "Assinatura Inativa"}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          {isTrialExpired
            ? "Seu período de teste gratuito de 7 dias terminou. Para continuar usando o Anotô, escolha um plano de assinatura."
            : "Sua assinatura está inativa ou com pagamento pendente. Regularize para continuar usando o sistema."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={onGoToSubscription}
            className="w-full gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Ver Planos de Assinatura
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

        {/* Help Text */}
        <p className="mt-8 text-xs text-muted-foreground">
          Dúvidas? Entre em contato pelo WhatsApp:{" "}
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            (11) 99999-9999
          </a>
        </p>
      </motion.div>
    </div>
  );
}
