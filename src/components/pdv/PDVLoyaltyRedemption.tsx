import { useState, useEffect } from "react";
import { Gift, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { validateCPF } from "@/lib/validators";
import { toast } from "sonner";

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: number | null;
  is_percentage: boolean | null;
}

interface CustomerPoints {
  total_points: number;
  customer_name: string;
  customer_cpf: string | null;
}

export interface AppliedReward {
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  customerCpf: string;
}

interface PDVLoyaltyRedemptionProps {
  storeId: string;
  subtotal: number;
  onRewardApplied: (reward: AppliedReward | null) => void;
  appliedReward: AppliedReward | null;
  onCpfForPoints?: (cpf: string | null) => void; // CPF for earning points
  cpfForPoints?: string | null;
}

// Format CPF with mask
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

export function PDVLoyaltyRedemption({
  storeId,
  subtotal,
  onRewardApplied,
  appliedReward,
  onCpfForPoints,
  cpfForPoints,
}: PDVLoyaltyRedemptionProps) {
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Check if loyalty is enabled for this store
  useEffect(() => {
    const checkLoyalty = async () => {
      const { data } = await supabase
        .from("loyalty_settings")
        .select("is_enabled")
        .eq("store_id", storeId)
        .eq("is_enabled", true)
        .maybeSingle();
      
      setLoyaltyEnabled(!!data?.is_enabled);
    };
    
    checkLoyalty();
  }, [storeId]);

  const handleCpfChange = (value: string) => {
    setCpf(formatCPF(value));
    setCpfError("");
  };

  const checkPoints = async () => {
    const cleanCpf = cpf.replace(/\D/g, "");
    
    if (cleanCpf.length !== 11) {
      setCpfError("CPF deve ter 11 dígitos");
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setCpfError("CPF inválido");
      return;
    }
    
    setIsChecking(true);
    setCpfError("");
    
    try {
      // Fetch customer points by CPF
      const { data: pointsData, error: pointsError } = await supabase
        .from("customer_points")
        .select("total_points, customer_name, customer_cpf")
        .eq("store_id", storeId)
        .eq("customer_cpf", cleanCpf)
        .maybeSingle();

      if (pointsError) throw pointsError;

      if (!pointsData || pointsData.total_points === 0) {
        setCustomerPoints(null);
        setRewards([]);
        // Even without points, save CPF for earning points
        onCpfForPoints?.(cleanCpf);
        toast.info("CPF salvo para acúmulo de pontos");
        return;
      }

      // Save CPF for earning points
      onCpfForPoints?.(cleanCpf);

      setCustomerPoints(pointsData);

      // Fetch available rewards
      const { data: rewardsData } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("points_required", { ascending: true });

      setRewards(rewardsData || []);
    } catch (error) {
      console.error("Error checking points:", error);
      toast.error("Erro ao verificar pontos");
    } finally {
      setIsChecking(false);
    }
  };

  const handleRedeemReward = async (reward: LoyaltyReward) => {
    if (!customerPoints || customerPoints.total_points < reward.points_required) {
      toast.error("Pontos insuficientes para esta recompensa");
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");

    setIsRedeeming(true);
    try {
      // Calculate discount
      let discountAmount = 0;
      const discountType = reward.is_percentage ? "percentage" : "fixed";
      const discountValue = reward.reward_value || 0;

      if (reward.is_percentage) {
        discountAmount = (subtotal * discountValue) / 100;
        discountAmount = Math.min(discountAmount, subtotal);
      } else {
        discountAmount = Math.min(discountValue, subtotal);
      }

      const appliedRewardData: AppliedReward = {
        rewardId: reward.id,
        rewardName: reward.name,
        pointsUsed: reward.points_required,
        discountAmount,
        discountType,
        discountValue,
        customerCpf: cleanCpf,
      };

      onRewardApplied(appliedRewardData);
      toast.success(`Recompensa aplicada! Desconto de ${formatCurrency(discountAmount)}`);
    } catch (error) {
      console.error("Error redeeming reward:", error);
      toast.error("Erro ao resgatar recompensa");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleRemoveReward = () => {
    onRewardApplied(null);
    setCustomerPoints(null);
    setCpf("");
    setRewards([]);
    toast.success("Recompensa removida");
  };

  const resetSearch = () => {
    setCustomerPoints(null);
    setCpf("");
    setRewards([]);
  };

  if (!loyaltyEnabled) return null;

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-amber-500" />
        <span className="font-medium text-sm">Programa de Fidelidade</span>
      </div>

      {appliedReward ? (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
          <div>
            <p className="font-medium text-sm text-amber-600">{appliedReward.rewardName}</p>
            <p className="text-xs text-amber-600/80">
              -{formatCurrency(appliedReward.discountAmount)} • {appliedReward.pointsUsed} pts
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemoveReward}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : customerPoints ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
            <div>
              <p className="text-xs text-muted-foreground">{customerPoints.customer_name}</p>
              <p className="text-lg font-bold text-amber-500">{customerPoints.total_points} pts</p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetSearch}>
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          </div>

          {rewards.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {rewards.map((reward) => {
                const canRedeem = customerPoints.total_points >= reward.points_required;

                return (
                  <div
                    key={reward.id}
                    className={`flex items-center justify-between p-2 rounded border ${
                      canRedeem
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/20 opacity-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{reward.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {reward.is_percentage
                          ? `${reward.reward_value}% off`
                          : formatCurrency(reward.reward_value || 0)} • {reward.points_required} pts
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={canRedeem ? "default" : "outline"}
                      disabled={!canRedeem || isRedeeming}
                      onClick={() => handleRedeemReward(reward)}
                      className={`h-7 text-xs ${canRedeem ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    >
                      {isRedeeming ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : canRedeem ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Usar
                        </>
                      ) : (
                        "Insuf."
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {rewards.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma recompensa disponível
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="CPF do cliente"
            value={cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkPoints()}
            className={`h-8 text-sm ${cpfError ? "border-destructive" : ""}`}
            maxLength={14}
          />
          <Button
            size="sm"
            onClick={checkPoints}
            disabled={isChecking || cpf.replace(/\D/g, "").length < 11}
            className="shrink-0 h-8 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buscar"}
          </Button>
        </div>
      )}
      {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
    </div>
  );
}
