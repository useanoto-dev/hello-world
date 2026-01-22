import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, Rocket } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface TrialInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialEndsAt: string | null;
  createdAt: string | null;
  onGoToSubscription: () => void;
}

function calculateTimeRemaining(endDate: Date | null) {
  if (!endDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  const now = new Date();
  const diff = Math.max(0, endDate.getTime() - now.getTime());
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

export function TrialInfoModal({
  open,
  onOpenChange,
  trialEndsAt,
  createdAt,
  onGoToSubscription,
}: TrialInfoModalProps) {
  const endDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const startDate = createdAt ? new Date(createdAt) : null;
  
  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeRemaining(endDate));
  
  // Update countdown every second when modal is open
  useEffect(() => {
    if (!open || !endDate) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endDate));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [open, endDate]);

  // Calculate progress (7 days trial)
  const totalTrialDays = 7;
  const now = new Date();
  const msUsed = startDate ? now.getTime() - startDate.getTime() : 0;
  const daysUsed = Math.min(totalTrialDays, Math.max(0, Math.floor(msUsed / (1000 * 60 * 60 * 24))));
  const progressPercent = Math.min(100, (daysUsed / totalTrialDays) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Período de Teste
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso do trial</span>
              <span className="font-medium">{daysUsed} de {totalTrialDays} dias</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Countdown Timer */}
          <div className="bg-primary/5 rounded-lg p-5 text-center">
            <Clock className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="text-2xl font-bold text-primary">
              {timeRemaining.days} dias, {timeRemaining.hours}h, {timeRemaining.minutes}min e {timeRemaining.seconds}s
            </p>
            <p className="text-xs text-muted-foreground mt-2">restantes para ativar seu plano</p>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Início do trial
              </div>
              <span className="text-sm font-medium">
                {startDate 
                  ? format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Expira em
              </div>
              <span className="text-sm font-medium">
                {endDate 
                  ? format(endDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "-"}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2">
            <Button 
              onClick={() => {
                onOpenChange(false);
                onGoToSubscription();
              }}
              className="w-full"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Ativar Plano Agora
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Ative antes do trial expirar e não perca nenhum dado!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
