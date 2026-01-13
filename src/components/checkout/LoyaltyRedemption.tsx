import { useState, useEffect } from "react";
import { Gift, Loader2, Check, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { validateCPF } from "@/lib/validators";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

interface AppliedReward {
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
}

interface LoyaltyRedemptionProps {
  storeId: string;
  customerCpf: string | undefined;
  subtotal: number;
  onRewardApplied: (reward: AppliedReward | null) => void;
  appliedReward: AppliedReward | null;
  onCpfChange?: (cpf: string) => void;
}

// Format CPF with mask
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

export function LoyaltyRedemption({
  storeId,
  customerCpf,
  subtotal,
  onRewardApplied,
  appliedReward,
  onCpfChange,
}: LoyaltyRedemptionProps) {
  const [cpf, setCpf] = useState(customerCpf ? formatCPF(customerCpf) : "");
  const [cpfError, setCpfError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

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

  // Auto-check points if customer CPF is provided
  useEffect(() => {
    if (customerCpf && loyaltyEnabled) {
      const cleanCpf = customerCpf.replace(/\D/g, "");
      if (cleanCpf.length === 11 && validateCPF(cleanCpf)) {
        setCpf(formatCPF(cleanCpf));
        checkPoints(cleanCpf);
      }
    }
  }, [customerCpf, loyaltyEnabled]);

  const handleCpfChange = (value: string) => {
    setCpf(formatCPF(value));
    setCpfError("");
  };

  const checkPoints = async (cpfToCheck?: string) => {
    const cleanCpf = (cpfToCheck || cpf).replace(/\D/g, "");
    
    if (cleanCpf.length !== 11) {
      setCpfError("CPF deve ter 11 dígitos");
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setCpfError("CPF inválido");
      return;
    }

    // Save CPF to incompleteOrder for later use during order submission
    onCpfChange?.(cleanCpf);
    
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
        if (!cpfToCheck) toast.info("Você ainda não possui pontos acumulados");
        return;
      }

      setCustomerPoints(pointsData);

      // Fetch available rewards
      const { data: rewardsData } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("points_required", { ascending: true });

      setRewards(rewardsData || []);
      setShowRewards(true);
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
      };

      onRewardApplied(appliedRewardData);
      setShowRewards(false);
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
    toast.success("Recompensa removida");
  };

  if (!loyaltyEnabled) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-amber-500" />
        <h2 className="font-semibold text-foreground">Programa de Fidelidade</h2>
      </div>

      {appliedReward ? (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div>
            <p className="font-medium text-primary">{appliedReward.rewardName}</p>
            <p className="text-sm text-primary/80">
              {appliedReward.discountType === "percentage" ? (
                <>-{appliedReward.discountValue}% ({formatCurrency(appliedReward.discountAmount)})</>
              ) : (
                <>-{formatCurrency(appliedReward.discountAmount)}</>
              )}
              <span className="ml-2 text-xs">• {appliedReward.pointsUsed} pontos</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemoveReward}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : customerPoints ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div>
              <p className="text-sm text-muted-foreground">Seus pontos</p>
              <p className="text-2xl font-bold text-amber-500">{customerPoints.total_points}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRewards(!showRewards)}
            >
              {showRewards ? "Ocultar" : "Ver recompensas"}
            </Button>
          </div>

          <AnimatePresence>
            {showRewards && rewards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {rewards.map((reward) => {
                  const canRedeem = customerPoints.total_points >= reward.points_required;
                  const progress = Math.min(
                    100,
                    (customerPoints.total_points / reward.points_required) * 100
                  );

                  return (
                    <div
                      key={reward.id}
                      className={`p-3 rounded-lg border ${
                        canRedeem
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${canRedeem ? "text-foreground" : "text-muted-foreground"}`}>
                            {reward.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reward.is_percentage
                              ? `${reward.reward_value}% de desconto`
                              : `${formatCurrency(reward.reward_value || 0)} de desconto`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {reward.points_required} pts
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={canRedeem ? "default" : "outline"}
                          disabled={!canRedeem || isRedeeming}
                          onClick={() => handleRedeemReward(reward)}
                          className={canRedeem ? "bg-amber-500 hover:bg-amber-600" : ""}
                        >
                          {isRedeeming ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : canRedeem ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Resgatar
                            </>
                          ) : (
                            `Faltam ${reward.points_required - customerPoints.total_points}`
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {showRewards && rewards.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma recompensa disponível no momento
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Digite seu CPF"
              value={cpf}
              onChange={(e) => handleCpfChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkPoints()}
              className={`h-10 ${cpfError ? "border-destructive" : ""}`}
              maxLength={14}
            />
            <Button
              onClick={() => checkPoints()}
              disabled={isChecking || cpf.replace(/\D/g, "").length < 11}
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
            </Button>
          </div>
          {cpfError && (
            <p className="text-xs text-destructive">{cpfError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Verifique seus pontos e descontos disponíveis
          </p>
        </div>
      )}
    </motion.section>
  );
}
