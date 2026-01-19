import { AlertTriangle, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";

interface TrialExpiringAlertProps {
  daysRemaining: number;
  onDismiss?: () => void;
}

export default function TrialExpiringAlert({ daysRemaining, onDismiss }: TrialExpiringAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || daysRemaining > 3 || daysRemaining < 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const urgencyLevel = daysRemaining <= 1 ? "critical" : daysRemaining <= 2 ? "warning" : "info";

  const styles = {
    critical: {
      bg: "bg-destructive/10 border-destructive/50",
      text: "text-destructive",
      icon: "text-destructive",
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/50",
      text: "text-amber-600 dark:text-amber-400",
      icon: "text-amber-500",
    },
    info: {
      bg: "bg-primary/10 border-primary/50",
      text: "text-primary",
      icon: "text-primary",
    },
  };

  const currentStyle = styles[urgencyLevel];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-lg border p-4 ${currentStyle.bg}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${currentStyle.icon}`} />
            <div>
              <h4 className={`font-semibold ${currentStyle.text}`}>
                {daysRemaining === 0
                  ? "Seu trial expira hoje!"
                  : daysRemaining === 1
                  ? "Seu trial expira amanhã!"
                  : `Seu trial expira em ${daysRemaining} dias`}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {daysRemaining <= 1
                  ? "Assine agora para não perder acesso às funcionalidades do sistema."
                  : "Aproveite para assinar e garantir acesso contínuo a todas as funcionalidades."}
              </p>
              <Button asChild size="sm" className="mt-3 gap-2">
                <Link to="/dashboard/subscription">
                  <CreditCard className="w-4 h-4" />
                  Ver Planos
                </Link>
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
