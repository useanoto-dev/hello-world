import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, Rocket, X } from "lucide-react";
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

export function TrialInfoModal({
  open,
  onOpenChange,
  trialEndsAt,
  createdAt,
  onGoToSubscription,
}: TrialInfoModalProps) {
  const now = new Date();
  const endDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const startDate = createdAt ? new Date(createdAt) : null;
  
  // Calculate days remaining
  const daysRemaining = endDate 
    ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Calculate hours remaining for the current day
  const hoursRemaining = endDate
    ? Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)) % 24)
    : 0;

  // Calculate progress (7 days trial)
  const totalTrialDays = 7;
  const daysUsed = startDate 
    ? Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
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

          {/* Time Remaining */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{daysRemaining}</p>
              <p className="text-xs text-muted-foreground">dias restantes</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{hoursRemaining}</p>
              <p className="text-xs text-muted-foreground">horas restantes</p>
            </div>
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
