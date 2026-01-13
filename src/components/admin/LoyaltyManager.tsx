import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Gift, Star, Settings, Users, TrendingUp, Plus, Edit2, Trash2, 
  Award, Coins, ArrowUpRight, ArrowDownRight, History, Crown, Medal, Shield, Check
} from "lucide-react";

interface LoyaltySettings {
  id: string;
  store_id: string;
  is_enabled: boolean;
  points_per_currency: number;
  min_order_for_points: number;
  welcome_bonus: number;
  tiers_enabled: boolean;
  tier_bronze_min: number;
  tier_bronze_bonus: number;
  tier_silver_min: number;
  tier_silver_bonus: number;
  tier_gold_min: number;
  tier_gold_bonus: number;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: number | null;
  is_percentage: boolean;
  is_active: boolean;
  redemptions_count: number;
}

interface CustomerPoints {
  id: string;
  customer_phone: string;
  customer_cpf: string | null;
  customer_name: string;
  total_points: number;
  lifetime_points: number;
  updated_at: string;
  tier: string;
}

interface PointTransaction {
  id: string;
  customer_phone: string;
  customer_cpf: string | null;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface LoyaltyManagerProps {
  storeId: string;
}

export function LoyaltyManager({ storeId }: LoyaltyManagerProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [customers, setCustomers] = useState<CustomerPoints[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPoints | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<PointTransaction[]>([]);
  const [loadingCustomerTx, setLoadingCustomerTx] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Reward form state
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    points_required: 100,
    reward_type: "discount",
    reward_value: 10,
    is_percentage: false,
  });

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from("loyalty_settings")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData as LoyaltySettings);
      }

      // Load rewards
      const { data: rewardsData } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("store_id", storeId)
        .order("points_required", { ascending: true });

      setRewards((rewardsData as LoyaltyReward[]) || []);

      // Load customer points
      const { data: customersData } = await supabase
        .from("customer_points")
        .select("*")
        .eq("store_id", storeId)
        .order("total_points", { ascending: false })
        .limit(50);

      setCustomers((customersData as CustomerPoints[]) || []);

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100);

      setTransactions((transactionsData as PointTransaction[]) || []);
    } catch (error) {
      console.error("Error loading loyalty data:", error);
      toast.error("Erro ao carregar dados de fidelidade");
    } finally {
      setLoading(false);
    }
  };

  const toggleLoyalty = async (enabled: boolean) => {
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from("loyalty_settings")
          .update({ is_enabled: enabled })
          .eq("id", settings.id);

        if (error) throw error;
        setSettings({ ...settings, is_enabled: enabled });
      } else {
        const { data, error } = await supabase
          .from("loyalty_settings")
          .insert({
            store_id: storeId,
            is_enabled: enabled,
            points_per_currency: 1,
            min_order_for_points: 0,
            welcome_bonus: 0,
            tiers_enabled: false,
            tier_bronze_min: 0,
            tier_bronze_bonus: 0,
            tier_silver_min: 500,
            tier_silver_bonus: 5,
            tier_gold_min: 1500,
            tier_gold_bonus: 10,
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data as LoyaltySettings);
      }
      toast.success(enabled ? "Programa de fidelidade ativado!" : "Programa de fidelidade desativado");
    } catch (error) {
      console.error("Error toggling loyalty:", error);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("loyalty_settings")
        .update({
          points_per_currency: settings.points_per_currency,
          min_order_for_points: settings.min_order_for_points,
          welcome_bonus: settings.welcome_bonus,
          tiers_enabled: settings.tiers_enabled,
          tier_bronze_min: settings.tier_bronze_min,
          tier_bronze_bonus: settings.tier_bronze_bonus,
          tier_silver_min: settings.tier_silver_min,
          tier_silver_bonus: settings.tier_silver_bonus,
          tier_gold_min: settings.tier_gold_min,
          tier_gold_bonus: settings.tier_gold_bonus,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const openRewardDialog = (reward?: LoyaltyReward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description || "",
        points_required: reward.points_required,
        reward_type: reward.reward_type,
        reward_value: reward.reward_value || 0,
        is_percentage: reward.is_percentage,
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        name: "",
        description: "",
        points_required: 100,
        reward_type: "discount",
        reward_value: 10,
        is_percentage: false,
      });
    }
    setRewardDialogOpen(true);
  };

  const saveReward = async () => {
    if (!rewardForm.name.trim()) {
      toast.error("Digite o nome da recompensa");
      return;
    }

    setSaving(true);
    try {
      const rewardData = {
        store_id: storeId,
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim() || null,
        points_required: rewardForm.points_required,
        reward_type: rewardForm.reward_type,
        reward_value: rewardForm.reward_value,
        is_percentage: rewardForm.is_percentage,
      };

      if (editingReward) {
        const { error } = await supabase
          .from("loyalty_rewards")
          .update(rewardData)
          .eq("id", editingReward.id);

        if (error) throw error;
        toast.success("Recompensa atualizada!");
      } else {
        const { error } = await supabase
          .from("loyalty_rewards")
          .insert(rewardData);

        if (error) throw error;
        toast.success("Recompensa criada!");
      }

      setRewardDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving reward:", error);
      toast.error("Erro ao salvar recompensa");
    } finally {
      setSaving(false);
    }
  };

  const toggleRewardActive = async (reward: LoyaltyReward) => {
    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .update({ is_active: !reward.is_active })
        .eq("id", reward.id);

      if (error) throw error;
      setRewards(rewards.map(r => r.id === reward.id ? { ...r, is_active: !r.is_active } : r));
      toast.success(reward.is_active ? "Recompensa desativada" : "Recompensa ativada");
    } catch (error) {
      console.error("Error toggling reward:", error);
      toast.error("Erro ao atualizar recompensa");
    }
  };

  const deleteReward = async (reward: LoyaltyReward) => {
    if (!confirm("Tem certeza que deseja excluir esta recompensa?")) return;

    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .delete()
        .eq("id", reward.id);

      if (error) throw error;
      setRewards(rewards.filter(r => r.id !== reward.id));
      toast.success("Recompensa excluída");
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast.error("Erro ao excluir recompensa");
    }
  };

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case "discount": return "Desconto";
      case "free_item": return "Item Grátis";
      case "free_delivery": return "Entrega Grátis";
      default: return type;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earned":
      case "bonus":
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case "redeemed":
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Coins className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "gold":
        return { label: "Ouro", color: "text-amber-500", bgColor: "bg-amber-500/10", icon: Crown };
      case "silver":
        return { label: "Prata", color: "text-slate-500", bgColor: "bg-slate-400/10", icon: Medal };
      default:
        return { label: "Bronze", color: "text-amber-700", bgColor: "bg-amber-700/10", icon: Shield };
    }
  };

  const calculateTier = (lifetimePoints: number) => {
    if (!settings?.tiers_enabled) return "bronze";
    if (lifetimePoints >= settings.tier_gold_min) return "gold";
    if (lifetimePoints >= settings.tier_silver_min) return "silver";
    return "bronze";
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const loadCustomerTransactions = async (customer: CustomerPoints) => {
    setSelectedCustomer(customer);
    setLoadingCustomerTx(true);
    try {
      const { data } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("store_id", storeId)
        .or(customer.customer_cpf 
          ? `customer_cpf.eq.${customer.customer_cpf},customer_phone.eq.${customer.customer_phone}`
          : `customer_phone.eq.${customer.customer_phone}`
        )
        .order("created_at", { ascending: false })
        .limit(50);
      
      setCustomerTransactions((data as PointTransaction[]) || []);
    } catch (error) {
      console.error("Error loading customer transactions:", error);
    } finally {
      setLoadingCustomerTx(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!customerSearch.trim()) return true;
    const search = customerSearch.toLowerCase();
    return (
      customer.customer_name.toLowerCase().includes(search) ||
      customer.customer_phone.includes(search) ||
      (customer.customer_cpf && customer.customer_cpf.includes(customerSearch.replace(/\D/g, '')))
    );
  });

  // Stats
  const totalCustomers = customers.length;
  const totalPointsIssued = customers.reduce((sum, c) => sum + c.lifetime_points, 0);
  const activeRewards = rewards.filter(r => r.is_active).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Programa de Fidelidade
          </h2>
          <p className="text-muted-foreground">
            Recompense seus clientes com pontos a cada pedido
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {settings?.is_enabled ? "Ativado" : "Desativado"}
          </span>
          <Switch
            checked={settings?.is_enabled || false}
            onCheckedChange={toggleLoyalty}
            disabled={saving}
          />
        </div>
      </div>

      {/* Stats Cards */}
      {settings?.is_enabled && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                </div>
                <Users className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pontos Emitidos</p>
                  <p className="text-2xl font-bold">{totalPointsIssued.toLocaleString()}</p>
                </div>
                <Coins className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recompensas Ativas</p>
                  <p className="text-2xl font-bold">{activeRewards}</p>
                </div>
                <Award className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Pontos</p>
                  <p className="text-2xl font-bold">{settings.points_per_currency}x</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {settings?.is_enabled && (
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="tiers" className="gap-2">
              <Crown className="w-4 h-4" />
              Níveis
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2">
              <Gift className="w-4 h-4" />
              Recompensas
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Pontos</CardTitle>
                <CardDescription>
                  Defina como os clientes ganham pontos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Pontos por R$1 gasto</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={settings.points_per_currency}
                      onChange={(e) => setSettings({
                        ...settings,
                        points_per_currency: parseFloat(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: 1 = 1 ponto por R$1 gasto
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor mínimo do pedido</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.min_order_for_points}
                      onChange={(e) => setSettings({
                        ...settings,
                        min_order_for_points: parseFloat(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pedidos abaixo deste valor não ganham pontos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Bônus de Boas-Vindas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.welcome_bonus}
                      onChange={(e) => setSettings({
                        ...settings,
                        welcome_bonus: parseInt(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pontos extras no primeiro pedido
                    </p>
                  </div>
                </div>

                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Níveis de Fidelidade
                    </CardTitle>
                    <CardDescription>
                      Clientes sobem de nível conforme acumulam pontos e ganham benefícios extras
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {settings.tiers_enabled ? "Ativado" : "Desativado"}
                    </span>
                    <Switch
                      checked={settings.tiers_enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, tiers_enabled: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings.tiers_enabled ? (
                  <>
                    {/* Tier Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Bronze */}
                      <div className="relative overflow-hidden rounded-xl border-2 border-amber-700/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 p-5">
                        <Shield className="absolute -right-4 -top-4 w-24 h-24 text-amber-700/10" />
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-700/20 flex items-center justify-center">
                              <Shield className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                              <h4 className="font-bold text-amber-700">Bronze</h4>
                              <p className="text-xs text-muted-foreground">Nível inicial</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Pontos mínimos</Label>
                              <Input
                                type="number"
                                min={0}
                                value={settings.tier_bronze_min}
                                onChange={(e) => setSettings({ ...settings, tier_bronze_min: parseInt(e.target.value) || 0 })}
                                className="bg-background/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Bônus de pontos (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={settings.tier_bronze_bonus}
                                onChange={(e) => setSettings({ ...settings, tier_bronze_bonus: parseFloat(e.target.value) || 0 })}
                                className="bg-background/50"
                              />
                              <p className="text-xs text-muted-foreground">Ex: 0% = sem bônus extra</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Silver */}
                      <div className="relative overflow-hidden rounded-xl border-2 border-slate-400/30 bg-gradient-to-br from-slate-400/20 to-slate-300/10 p-5">
                        <Medal className="absolute -right-4 -top-4 w-24 h-24 text-slate-400/10" />
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-400/20 flex items-center justify-center">
                              <Medal className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-500">Prata</h4>
                              <p className="text-xs text-muted-foreground">Nível intermediário</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Pontos mínimos</Label>
                              <Input
                                type="number"
                                min={0}
                                value={settings.tier_silver_min}
                                onChange={(e) => setSettings({ ...settings, tier_silver_min: parseInt(e.target.value) || 0 })}
                                className="bg-background/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Bônus de pontos (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={settings.tier_silver_bonus}
                                onChange={(e) => setSettings({ ...settings, tier_silver_bonus: parseFloat(e.target.value) || 0 })}
                                className="bg-background/50"
                              />
                              <p className="text-xs text-muted-foreground">Ex: 5% = ganha 5% a mais de pontos</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gold */}
                      <div className="relative overflow-hidden rounded-xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-400/20 to-amber-300/10 p-5">
                        <Crown className="absolute -right-4 -top-4 w-24 h-24 text-amber-400/10" />
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                              <Crown className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-amber-500">Ouro</h4>
                              <p className="text-xs text-muted-foreground">Nível VIP</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Pontos mínimos</Label>
                              <Input
                                type="number"
                                min={0}
                                value={settings.tier_gold_min}
                                onChange={(e) => setSettings({ ...settings, tier_gold_min: parseInt(e.target.value) || 0 })}
                                className="bg-background/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Bônus de pontos (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={settings.tier_gold_bonus}
                                onChange={(e) => setSettings({ ...settings, tier_gold_bonus: parseFloat(e.target.value) || 0 })}
                                className="bg-background/50"
                              />
                              <p className="text-xs text-muted-foreground">Ex: 10% = ganha 10% a mais de pontos</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button onClick={saveSettings} disabled={saving}>
                      {saving ? "Salvando..." : "Salvar Configurações de Níveis"}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Crown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sistema de níveis desativado</p>
                    <p className="text-sm">Ative para recompensar clientes fiéis com bônus progressivos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recompensas</CardTitle>
                  <CardDescription>
                    Prêmios que os clientes podem resgatar
                  </CardDescription>
                </div>
                <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openRewardDialog()} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nova Recompensa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingReward ? "Editar Recompensa" : "Nova Recompensa"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Ex: Desconto de R$10"
                          value={rewardForm.name}
                          onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição (opcional)</Label>
                        <Textarea
                          placeholder="Descrição da recompensa..."
                          value={rewardForm.description}
                          onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Pontos Necessários</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rewardForm.points_required}
                          onChange={(e) => setRewardForm({ 
                            ...rewardForm, 
                            points_required: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Recompensa</Label>
                        <Select
                          value={rewardForm.reward_type}
                          onValueChange={(value) => setRewardForm({ ...rewardForm, reward_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="discount">Desconto</SelectItem>
                            <SelectItem value="free_delivery">Entrega Grátis</SelectItem>
                            <SelectItem value="free_item">Item Grátis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {rewardForm.reward_type === "discount" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Valor do Desconto</Label>
                            <Input
                              type="number"
                              min={0}
                              value={rewardForm.reward_value}
                              onChange={(e) => setRewardForm({ 
                                ...rewardForm, 
                                reward_value: parseFloat(e.target.value) || 0 
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={rewardForm.is_percentage ? "percentage" : "fixed"}
                              onValueChange={(value) => setRewardForm({ 
                                ...rewardForm, 
                                is_percentage: value === "percentage" 
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">R$ (Fixo)</SelectItem>
                                <SelectItem value="percentage">% (Percentual)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={saveReward} disabled={saving}>
                          {saving ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma recompensa cadastrada</p>
                    <p className="text-sm">Crie recompensas para motivar seus clientes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          reward.is_active ? "bg-muted/30" : "bg-muted/10 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Star className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{reward.name}</p>
                              {!reward.is_active && (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {reward.points_required} pontos • {getRewardTypeLabel(reward.reward_type)}
                              {reward.reward_type === "discount" && reward.reward_value && (
                                <> • {reward.is_percentage ? `${reward.reward_value}%` : formatCurrency(reward.reward_value)}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRewardDialog(reward)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={reward.is_active}
                            onCheckedChange={() => toggleRewardActive(reward)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteReward(reward)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Clientes do Programa</CardTitle>
                <CardDescription>
                  Todos os clientes cadastrados por CPF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative max-w-md">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone ou CPF..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground space-y-3">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">{customerSearch ? "Nenhum cliente encontrado" : "Nenhum cliente com pontos ainda"}</p>
                    {!customerSearch && (
                      <div className="max-w-md mx-auto">
                        <p className="text-sm">Os clientes são cadastrados automaticamente quando:</p>
                        <ul className="text-sm text-left mt-2 space-y-1 bg-muted/50 p-3 rounded-lg">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span>O programa de fidelidade está ativo</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span>O cliente informa o CPF durante o checkout</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span>O pedido atinge o valor mínimo configurado</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCustomers.map((customer, index) => {
                      const tier = calculateTier(customer.lifetime_points);
                      const tierInfo = getTierInfo(tier);
                      const TierIcon = tierInfo.icon;
                      
                      return (
                        <div
                          key={customer.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => loadCustomerTransactions(customer)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{customer.customer_name}</p>
                                {settings?.tiers_enabled && (
                                  <Badge variant="outline" className={`${tierInfo.color} ${tierInfo.bgColor} gap-1 text-xs`}>
                                    <TierIcon className="w-3 h-3" />
                                    {tierInfo.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{customer.customer_phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}</span>
                                {customer.customer_cpf && (
                                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                    CPF: {formatCPF(customer.customer_cpf)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary text-lg">{customer.total_points} pts</p>
                            <p className="text-xs text-muted-foreground">
                              Acumulado: {customer.lifetime_points} pts
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Customer Transactions Modal */}
                <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
                  <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Histórico de {selectedCustomer?.customer_name}
                      </DialogTitle>
                    </DialogHeader>
                    
                    {selectedCustomer && (
                      <div className="space-y-4 flex-1 overflow-y-auto">
                        {/* Customer Info */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Telefone</span>
                            <span className="font-medium">
                              {selectedCustomer.customer_phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                            </span>
                          </div>
                          {selectedCustomer.customer_cpf && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">CPF</span>
                              <span className="font-mono">{formatCPF(selectedCustomer.customer_cpf)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-sm text-muted-foreground">Saldo Atual</span>
                            <span className="font-bold text-primary text-lg">{selectedCustomer.total_points} pts</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Acumulado</span>
                            <span className="font-medium">{selectedCustomer.lifetime_points} pts</span>
                          </div>
                        </div>

                        {/* Transactions List */}
                        <div className="flex-1 overflow-y-auto max-h-64 space-y-2">
                          {loadingCustomerTx ? (
                            <div className="space-y-2">
                              {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-12" />
                              ))}
                            </div>
                          ) : customerTransactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Nenhuma transação encontrada</p>
                            </div>
                          ) : (
                            customerTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                              >
                                <div className="flex items-center gap-3">
                                  {getTransactionIcon(tx.type)}
                                  <div>
                                    <p className="text-sm">{tx.description || tx.type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <span className={`font-bold ${tx.points > 0 ? "text-green-500" : "text-red-500"}`}>
                                  {tx.points > 0 ? "+" : ""}{tx.points} pts
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>
                  Últimas 100 transações de pontos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma transação registrada</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(tx.type)}
                          <div>
                            <p className="text-sm">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.points > 0 ? "text-green-500" : "text-red-500"}`}>
                          {tx.points > 0 ? "+" : ""}{tx.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!settings?.is_enabled && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Programa de Fidelidade Desativado</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Ative o programa de fidelidade para recompensar seus clientes com pontos a cada pedido.
              Clientes fiéis gastam mais e retornam com mais frequência!
            </p>
            <Button onClick={() => toggleLoyalty(true)} disabled={saving} className="gap-2">
              <Star className="w-4 h-4" />
              Ativar Programa de Fidelidade
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
