import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Star, ChevronRight, Coins, Award, X, Crown, Medal, Shield, History, TrendingUp, TrendingDown, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/formatters";
import { validateCPF } from "@/lib/validators";
import { toast } from "sonner";

interface LoyaltySettings {
  points_per_currency: number;
  welcome_bonus: number;
  tiers_enabled: boolean;
  tier_bronze_min: number;
  tier_bronze_bonus: number;
  tier_silver_min: number;
  tier_silver_bonus: number;
  tier_gold_min: number;
  tier_gold_bonus: number;
}

interface CustomerPoints {
  total_points: number;
  lifetime_points: number;
  tier?: string;
  customer_cpf?: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: number | null;
  is_percentage: boolean;
}

interface PointTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface LoyaltyWidgetProps {
  storeId: string;
  storeName: string;
}

// CPF mask helper
const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export function LoyaltyWidget({ storeId, storeName }: LoyaltyWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cpfVerified, setCpfVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("rewards");

  // Check if loyalty is enabled for this store
  useEffect(() => {
    if (!storeId) return;
    
    const checkLoyalty = async () => {
      try {
        const { data, error } = await supabase
          .from("loyalty_settings")
          .select("points_per_currency, welcome_bonus, tiers_enabled, tier_bronze_min, tier_bronze_bonus, tier_silver_min, tier_silver_bonus, tier_gold_min, tier_gold_bonus")
          .eq("store_id", storeId)
          .eq("is_enabled", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching loyalty settings:", error);
          return;
        }

        if (data) {
          setSettings(data);
          
          // Load rewards
          const { data: rewardsData } = await supabase
            .from("loyalty_rewards")
            .select("id, name, description, points_required, reward_type, reward_value, is_percentage")
            .eq("store_id", storeId)
            .eq("is_active", true)
            .order("points_required", { ascending: true });

          setRewards((rewardsData as LoyaltyReward[]) || []);
        } else {
          // Reset if loyalty is not enabled
          setSettings(null);
          setRewards([]);
        }
      } catch (err) {
        console.error("Error checking loyalty:", err);
      }
    };

    checkLoyalty();

    // Check for saved CPF
    const savedCpf = localStorage.getItem("anoto_customer_cpf");
    if (savedCpf) {
      setCpf(formatCPF(savedCpf));
    }
  }, [storeId]);

  // Real-time subscription for points updates
  useEffect(() => {
    if (!storeId || !cpfVerified) return;

    const cleanCpf = cpf.replace(/\D/g, "");
    if (!cleanCpf) return;

    const channel = supabase
      .channel('loyalty-points-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_points',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const newData = payload.new as CustomerPoints & { customer_cpf: string };
          if (newData.customer_cpf === cleanCpf) {
            setCustomerPoints({
              total_points: newData.total_points,
              lifetime_points: newData.lifetime_points,
              tier: newData.tier
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_transactions',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const newTx = payload.new as PointTransaction & { customer_cpf: string };
          if (newTx.customer_cpf === cleanCpf) {
            setTransactions(prev => [newTx, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, cpfVerified, cpf]);

  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
    setCpfError(null);
  };

  const checkPoints = async () => {
    const cleanCpf = cpf.replace(/\D/g, "");
    
    if (cleanCpf.length !== 11) {
      setCpfError("CPF deve ter 11 dígitos");
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setCpfError("CPF inválido - verifique os dígitos");
      return;
    }

    setLoading(true);
    setCpfError(null);

    try {
      // Fetch points by CPF
      const { data } = await supabase
        .from("customer_points")
        .select("total_points, lifetime_points, tier, customer_cpf")
        .eq("store_id", storeId)
        .eq("customer_cpf", cleanCpf)
        .maybeSingle();

      if (data) {
        setCustomerPoints(data);
      } else {
        setCustomerPoints({ total_points: 0, lifetime_points: 0 });
      }

      // Fetch transactions history by CPF
      const { data: transactionsData } = await supabase
        .from("point_transactions")
        .select("id, points, type, description, created_at")
        .eq("store_id", storeId)
        .eq("customer_cpf", cleanCpf)
        .order("created_at", { ascending: false })
        .limit(20);

      setTransactions((transactionsData as PointTransaction[]) || []);

      setCpfVerified(true);
      localStorage.setItem("anoto_customer_cpf", cleanCpf);
    } catch (error) {
      console.error("Error checking points:", error);
      toast.error("Erro ao verificar pontos");
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string, points: number) => {
    if (points > 0) {
      if (type === "welcome") return Sparkles;
      return TrendingUp;
    }
    return TrendingDown;
  };

  const getRewardTypeLabel = (reward: LoyaltyReward) => {
    switch (reward.reward_type) {
      case "discount":
        return reward.is_percentage 
          ? `${reward.reward_value}% de desconto` 
          : `${formatCurrency(reward.reward_value || 0)} de desconto`;
      case "free_delivery":
        return "Entrega Grátis";
      case "free_item":
        return "Item Grátis";
      default:
        return reward.reward_type;
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "gold":
        return { label: "Ouro", color: "text-amber-500", bgColor: "bg-amber-400/20", icon: Crown };
      case "silver":
        return { label: "Prata", color: "text-slate-400", bgColor: "bg-slate-400/20", icon: Medal };
      default:
        return { label: "Bronze", color: "text-amber-700", bgColor: "bg-amber-700/20", icon: Shield };
    }
  };

  const calculateTier = (lifetimePoints: number) => {
    if (!settings?.tiers_enabled) return null;
    if (lifetimePoints >= settings.tier_gold_min) return "gold";
    if (lifetimePoints >= settings.tier_silver_min) return "silver";
    return "bronze";
  };

  const getNextTierInfo = (tier: string | null, lifetimePoints: number) => {
    if (!settings?.tiers_enabled || !tier) return null;
    if (tier === "bronze") {
      const pointsNeeded = settings.tier_silver_min - lifetimePoints;
      return pointsNeeded > 0 ? { name: "Prata", pointsNeeded, bonus: settings.tier_silver_bonus } : null;
    }
    if (tier === "silver") {
      const pointsNeeded = settings.tier_gold_min - lifetimePoints;
      return pointsNeeded > 0 ? { name: "Ouro", pointsNeeded, bonus: settings.tier_gold_bonus } : null;
    }
    return null;
  };

  // Don't render if loyalty is not enabled
  if (!settings) return null;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg flex items-center justify-center"
      >
        <Gift className="w-6 h-6 text-white" />
        {customerPoints && customerPoints.total_points > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {customerPoints.total_points > 99 ? "99+" : customerPoints.total_points}
          </span>
        )}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-3xl shadow-xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Programa de Fidelidade</h3>
                    <p className="text-sm text-white/80">{storeName}</p>
                  </div>
                </div>

                {cpfVerified && customerPoints && (
                  <>
                    {settings.tiers_enabled && (() => {
                      const tier = calculateTier(customerPoints.lifetime_points);
                      const tierInfo = tier ? getTierInfo(tier) : null;
                      const TierIcon = tierInfo?.icon || Shield;
                      const nextTier = getNextTierInfo(tier, customerPoints.lifetime_points);
                      
                      return tierInfo && (
                        <div className="mb-3 flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full ${tierInfo.bgColor} flex items-center gap-1.5`}>
                            <TierIcon className={`w-4 h-4 ${tierInfo.color}`} />
                            <span className={`font-semibold ${tierInfo.color}`}>
                              Nível {tierInfo.label}
                            </span>
                          </div>
                          {nextTier && (
                            <span className="text-xs text-white/70">
                              Faltam {nextTier.pointsNeeded} pts para {nextTier.name}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/20 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white/80">Seu saldo</p>
                          <p className="text-3xl font-bold">{customerPoints.total_points} pts</p>
                        </div>
                        <Coins className="w-10 h-10 text-white/50" />
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {!cpfVerified ? (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <Coins className="w-12 h-12 mx-auto mb-2 text-amber-500" />
                      <h4 className="font-semibold">Consulte seus pontos</h4>
                      <p className="text-sm text-muted-foreground">
                        Digite seu CPF para ver seu saldo e participar do programa
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Input
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        className={`text-center text-lg ${cpfError ? 'border-red-500' : ''}`}
                        maxLength={14}
                      />
                      {cpfError && (
                        <p className="text-sm text-red-500 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {cpfError}
                        </p>
                      )}
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={checkPoints}
                      disabled={loading}
                    >
                      {loading ? "Verificando..." : "Consultar Pontos"}
                    </Button>

                    <div className="pt-4 border-t">
                      <p className="text-center text-sm text-muted-foreground mb-4">
                        Como funciona?
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="text-amber-600 font-bold">1</span>
                          </div>
                          <p>Ganhe <strong>{settings.points_per_currency} ponto</strong> a cada R$1 gasto</p>
                        </div>
                        {settings.welcome_bonus > 0 && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <Gift className="w-4 h-4 text-amber-600" />
                            </div>
                            <p>Ganhe <strong>{settings.welcome_bonus} pontos</strong> de boas-vindas!</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Award className="w-4 h-4 text-amber-600" />
                          </div>
                          <p>Troque seus pontos por recompensas incríveis!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Points earning info */}
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        Você ganha <strong className="text-foreground">{settings.points_per_currency} ponto</strong> a cada R$1 gasto
                      </p>
                    </div>

                    {/* Tabs for Rewards and History */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="rewards" className="gap-2">
                          <Award className="w-4 h-4" />
                          Recompensas
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                          <History className="w-4 h-4" />
                          Histórico
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="rewards" className="mt-4 space-y-2">
                        {rewards.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            Nenhuma recompensa disponível no momento
                          </p>
                        ) : (
                          rewards.map((reward) => {
                            const canRedeem = customerPoints && customerPoints.total_points >= reward.points_required;
                            const progress = customerPoints 
                              ? Math.min(100, (customerPoints.total_points / reward.points_required) * 100)
                              : 0;

                            return (
                              <motion.div
                                key={reward.id}
                                whileHover={{ scale: 1.01 }}
                                className={`relative overflow-hidden rounded-lg border p-4 ${
                                  canRedeem 
                                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                                    : "border-border bg-muted/30"
                                }`}
                              >
                                {/* Progress bar background */}
                                <div 
                                  className="absolute inset-0 bg-amber-500/10 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                                
                                <div className="relative flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{reward.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {getRewardTypeLabel(reward)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-bold ${canRedeem ? "text-amber-600" : "text-muted-foreground"}`}>
                                      {reward.points_required} pts
                                    </p>
                                    {!canRedeem && customerPoints && (
                                      <p className="text-xs text-muted-foreground">
                                        Faltam {reward.points_required - customerPoints.total_points} pts
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {canRedeem && (
                                  <Button 
                                    size="sm" 
                                    className="w-full mt-3 gap-2"
                                    onClick={() => toast.info("Em breve! O resgate será habilitado no checkout.")}
                                  >
                                    <Gift className="w-4 h-4" />
                                    Resgatar
                                  </Button>
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="history" className="mt-4">
                        {transactions.length === 0 ? (
                          <div className="text-center py-8">
                            <History className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma movimentação ainda
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Faça pedidos para acumular pontos!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {transactions.map((tx, index) => {
                              const Icon = getTransactionIcon(tx.type, tx.points);
                              const isPositive = tx.points > 0;

                              return (
                                <motion.div
                                  key={tx.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isPositive 
                                      ? "bg-emerald-100 dark:bg-emerald-900/30" 
                                      : "bg-red-100 dark:bg-red-900/30"
                                  }`}>
                                    <Icon className={`w-4 h-4 ${
                                      isPositive ? "text-emerald-600" : "text-red-600"
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {tx.description || (isPositive ? "Pontos ganhos" : "Pontos usados")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTransactionDate(tx.created_at)}
                                    </p>
                                  </div>
                                  <span className={`font-bold ${
                                    isPositive ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                    {isPositive ? "+" : ""}{tx.points}
                                  </span>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    {/* Check different CPF */}
                    <button
                      onClick={() => {
                        setCpfVerified(false);
                        setCustomerPoints(null);
                        setTransactions([]);
                        setActiveTab("rewards");
                      }}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      Consultar outro CPF
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
