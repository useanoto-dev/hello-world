import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { format, differenceInMinutes, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, CheckCircle, ChefHat, Truck, Package, 
  ArrowLeft, Phone, MapPin, ShoppingBag, XCircle, Timer, MessageCircle, Gamepad2, Star, Gift, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import GameSelector from "@/components/games/GameSelector";
import { PostOrderReviewModal } from "@/components/storefront/PostOrderReviewModal";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  address: any;
  payment_method: string;
  notes: string;
  created_at: string;
  updated_at: string;
  store_id: string;
}

interface StoreTimeSettings {
  estimated_prep_time: number;
  estimated_delivery_time: number;
  whatsapp: string | null;
  name: string;
  use_comanda_mode: boolean;
}

interface LoyaltyInfo {
  pointsEarned: number;
  totalPoints: number;
  tierLabel: string | null;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  pending: {
    label: "Aguardando Confirmação",
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Seu pedido foi recebido e está aguardando confirmação",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Seu pedido foi confirmado e será preparado em breve",
  },
  preparing: {
    label: "Em Preparo",
    icon: ChefHat,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description: "Estamos preparando seu pedido com carinho",
  },
  ready: {
    label: "Pronto",
    icon: Package,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    description: "Seu pedido está pronto!",
  },
  delivering: {
    label: "Saiu para Entrega",
    icon: Truck,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Seu pedido está a caminho",
  },
  completed: {
    label: "Entregue",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description: "Pedido entregue com sucesso!",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description: "Este pedido foi cancelado",
  },
};

const statusFlow = ["pending", "confirmed", "preparing", "ready", "delivering", "completed"];

const orderTypeLabels: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Retirada",
  dine_in: "Consumo Local",
};

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
};

export default function OrderTrackingPage() {
  const { slug, orderNumber } = useParams<{ slug: string; orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreTimeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGame, setShowGame] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasShownReviewPrompt, setHasShownReviewPrompt] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [hasCheckedLoyalty, setHasCheckedLoyalty] = useState(false);

  // Update current time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate time estimates based on store settings
  const timeEstimates = useMemo(() => {
    if (!order || !storeSettings) return null;
    
    const prepTime = storeSettings.estimated_prep_time || 25;
    const deliveryTime = storeSettings.estimated_delivery_time || 20;
    
    let total = prepTime;
    if (order.order_type === "delivery") {
      total = prepTime + deliveryTime;
    }
    
    const orderCreatedAt = new Date(order.created_at);
    const estimatedCompletionTime = addMinutes(orderCreatedAt, total);
    const minutesElapsed = differenceInMinutes(currentTime, orderCreatedAt);
    const minutesRemaining = Math.max(0, total - minutesElapsed);
    const progressPercent = Math.min(100, (minutesElapsed / total) * 100);

    return {
      preparation: prepTime,
      delivery: order.order_type === "delivery" ? deliveryTime : 0,
      total,
      estimatedCompletionTime,
      minutesElapsed,
      minutesRemaining,
      progressPercent,
    };
  }, [order, storeSettings, currentTime]);

  // Load order and store settings initially
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderNumber) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("order_number", parseInt(orderNumber))
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError("Pedido não encontrado");
          return;
        }

        setOrder({
          ...data,
          items: Array.isArray(data.items) ? (data.items as unknown as OrderItem[]) : [],
        });

        // Fetch store settings for estimated times and WhatsApp
        const { data: storeData } = await supabase
          .from("stores")
          .select("estimated_prep_time, estimated_delivery_time, whatsapp, name, use_comanda_mode")
          .eq("id", data.store_id)
          .maybeSingle();

        if (storeData) {
          setStoreSettings({
            estimated_prep_time: (storeData as any).estimated_prep_time || 25,
            estimated_delivery_time: (storeData as any).estimated_delivery_time || 20,
            whatsapp: (storeData as any).whatsapp || null,
            name: (storeData as any).name || "",
            use_comanda_mode: (storeData as any).use_comanda_mode !== false,
          });
        } else {
          setStoreSettings({ estimated_prep_time: 25, estimated_delivery_time: 20, whatsapp: null, name: "", use_comanda_mode: true });
        }
      } catch (err) {
        console.error("Erro ao carregar pedido:", err);
        setError("Erro ao carregar pedido");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderNumber]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setOrder((prev) => prev ? {
            ...prev,
            ...updated,
            items: Array.isArray(updated.items) ? updated.items : prev.items,
          } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  // Show review modal when order is completed
  useEffect(() => {
    if (order?.status === "completed" && !hasShownReviewPrompt) {
      const timer = setTimeout(() => {
        setShowReviewModal(true);
        setHasShownReviewPrompt(true);
      }, 1500); // Small delay for better UX
      return () => clearTimeout(timer);
    }
  }, [order?.status, hasShownReviewPrompt]);

  // Check for loyalty points when order is completed
  useEffect(() => {
    const checkLoyaltyPoints = async () => {
      if (order?.status === "completed" && order?.store_id && order?.customer_phone && !hasCheckedLoyalty) {
        setHasCheckedLoyalty(true);
        
        try {
          // Check if loyalty is enabled for this store
          const { data: settings } = await supabase
            .from("loyalty_settings")
            .select("is_enabled, tiers_enabled, tier_bronze_min, tier_silver_min, tier_gold_min")
            .eq("store_id", order.store_id)
            .eq("is_enabled", true)
            .maybeSingle();

          if (!settings) return;

          // Get customer points
          const { data: pointsData } = await supabase
            .from("customer_points")
            .select("total_points, lifetime_points, tier")
            .eq("store_id", order.store_id)
            .eq("customer_phone", order.customer_phone.replace(/\D/g, ""))
            .maybeSingle();

          if (!pointsData) return;

          // Get the most recent transaction for this order to show points earned
          const { data: transaction } = await supabase
            .from("point_transactions")
            .select("points, description")
            .eq("order_id", order.id)
            .eq("type", "earned")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Determine tier label
          let tierLabel: string | null = null;
          if (settings.tiers_enabled) {
            if (pointsData.lifetime_points >= settings.tier_gold_min) {
              tierLabel = "Ouro";
            } else if (pointsData.lifetime_points >= settings.tier_silver_min) {
              tierLabel = "Prata";
            } else {
              tierLabel = "Bronze";
            }
          }

          if (transaction) {
            setLoyaltyInfo({
              pointsEarned: transaction.points,
              totalPoints: pointsData.total_points,
              tierLabel,
            });
          }
        } catch (error) {
          console.error("Error checking loyalty points:", error);
        }
      }
    };

    checkLoyaltyPoints();
  }, [order?.status, order?.store_id, order?.customer_phone, order?.id, hasCheckedLoyalty]);

  const currentStatus = order?.status || "pending";
  const config = statusConfig[currentStatus] || statusConfig.pending;
  const StatusIcon = config.icon;
  const currentStepIndex = statusFlow.indexOf(currentStatus);
  const isSimpleMode = storeSettings?.use_comanda_mode === false;
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">{error || "Pedido não encontrado"}</h1>
        <p className="text-muted-foreground mb-6">
          Verifique o número do pedido e tente novamente.
        </p>
        <Button onClick={() => navigate(`/cardapio/${slug}`)}>
          Voltar ao Cardápio
        </Button>
      </div>
    );
  }

  // Modo simples: exibe apenas confirmação sem tracking detalhado
  if (isSimpleMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-500" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h1 className="text-2xl font-bold text-foreground">
            Pedido Confirmado!
          </h1>
          <p className="text-lg text-muted-foreground">
            Pedido #{order.order_number}
          </p>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Seu pedido foi recebido e chegará em breve. Aguarde!
          </p>
        </motion.div>

        {/* WhatsApp Button */}
        {storeSettings?.whatsapp && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const whatsappNumber = storeSettings.whatsapp?.replace(/\D/g, '');
                const message = `Olá! Gostaria de informações sobre meu pedido #${order.order_number}`;
                window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Falar com a loja
            </Button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/cardapio/${slug}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Cardápio
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/cardapio/${slug}`)}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-base font-bold">Pedido #{order.order_number}</h1>
              <p className="text-xs text-muted-foreground">
                {format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${config.bgColor} border border-border rounded-2xl p-6 text-center`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStatus}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center mb-4`}>
                <StatusIcon className={`w-10 h-10 ${config.color}`} />
              </div>
              <h2 className={`text-xl font-bold ${config.color} mb-1`}>
                {config.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Estimated Time */}
          {timeEstimates && currentStatus !== "completed" && currentStatus !== "cancelled" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 pt-4 border-t border-border/50"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tempo estimado</span>
              </div>
              
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-3xl font-bold text-foreground">
                  {timeEstimates.minutesRemaining}
                </span>
                <span className="text-lg text-muted-foreground">min</span>
              </div>

              <Progress value={timeEstimates.progressPercent} className="h-2 mb-2" />
              
              <p className="text-xs text-muted-foreground">
                Previsão: {format(timeEstimates.estimatedCompletionTime, "HH:mm")}
                {order.order_type === "delivery" && (
                  <span className="block mt-1">
                    (~{timeEstimates.preparation}min preparo + ~{timeEstimates.delivery}min entrega)
                  </span>
                )}
              </p>
            </motion.div>
          )}

          {/* Completed message */}
          {currentStatus === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 pt-4 border-t border-border/50 space-y-3"
            >
              <p className="text-sm text-green-600 font-medium">
                ✓ Pedido entregue com sucesso!
              </p>
              
              {/* Loyalty Points Feedback */}
              {loyaltyInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Você ganhou +{loyaltyInfo.pointsEarned} pontos! 🎉
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        Saldo total: {loyaltyInfo.totalPoints} pts
                        {loyaltyInfo.tierLabel && (
                          <span className="ml-1">• Nível {loyaltyInfo.tierLabel}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.section>

        {/* Progress Steps */}
        {currentStatus !== "cancelled" && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              {statusFlow.slice(0, order.order_type === "delivery" ? 6 : 4).map((status, index) => {
                const stepConfig = statusConfig[status];
                const StepIcon = stepConfig.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={status} className="flex flex-col items-center flex-1">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.1 : 1,
                        backgroundColor: isCompleted ? "hsl(var(--primary))" : "hsl(var(--muted))",
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors`}
                    >
                      <StepIcon className={`w-5 h-5 ${isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </motion.div>
                    <span className={`text-[10px] text-center leading-tight ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {stepConfig.label.split(" ")[0]}
                    </span>
                    {index < (order.order_type === "delivery" ? 5 : 3) && (
                      <div
                        className={`absolute h-0.5 w-full ${isCompleted ? "bg-primary" : "bg-muted"}`}
                        style={{ top: "20px", left: "50%", width: "calc(100% - 40px)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Order Details */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4 space-y-4"
        >
          {/* Customer Info */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
            </div>
            <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full">
              {orderTypeLabels[order.order_type]}
            </span>
          </div>

          {/* Address */}
          {order.order_type === "delivery" && order.address && (
            <div className="flex items-start gap-3 pb-3 border-b border-border">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">
                  {order.address.street}, {order.address.number}
                </p>
                {order.address.complement && (
                  <p className="text-muted-foreground">{order.address.complement}</p>
                )}
                {order.address.reference && (
                  <p className="text-muted-foreground text-xs">Ref: {order.address.reference}</p>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Itens do Pedido</h3>
            </div>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Entrega</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Pagamento: {paymentLabels[order.payment_method] || order.payment_method}
            </p>
          </div>
        </motion.section>

        {/* Review CTA Card - Always visible for non-cancelled orders */}
        {currentStatus !== "cancelled" && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-amber-600 fill-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                  O que achou do nosso serviço?
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Sua opinião nos ajuda a melhorar cada vez mais!
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={() => setShowReviewModal(true)}
            >
              <Star className="w-4 h-4 fill-white" />
              Avaliar Estabelecimento
            </Button>
          </motion.section>
        )}

        {/* Play Game Button */}
        {currentStatus !== "completed" && currentStatus !== "cancelled" && (
          <AnimatePresence>
            {!showGame ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onClick={() => setShowGame(true)}
                >
                  <Gamepad2 className="w-4 h-4" />
                  Jogar enquanto espera
                </Button>
              </motion.div>
            ) : (
              <GameSelector standalone onClose={() => setShowGame(false)} />
            )}
          </AnimatePresence>
        )}

        {/* WhatsApp Button */}
        {storeSettings?.whatsapp && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => {
              const cleanPhone = storeSettings.whatsapp!.replace(/\D/g, "");
              
              // Build order receipt message
              const itemsList = order.items
                .map(item => `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}`)
                .join("\n");
              
              const orderTypeText = orderTypeLabels[order.order_type] || order.order_type;
              const paymentText = paymentLabels[order.payment_method] || order.payment_method;
              
              let addressText = "";
              if (order.order_type === "delivery" && order.address) {
                addressText = `\n\n📍 *Endereço de Entrega:*\n${order.address.street}, ${order.address.number}${order.address.complement ? ` - ${order.address.complement}` : ""}\n${order.address.neighborhood || ""}${order.address.reference ? `\nRef: ${order.address.reference}` : ""}`;
              }
              
              const message = `🍕 *PEDIDO #${order.order_number}*
━━━━━━━━━━━━━━━━━━
👤 *Cliente:* ${order.customer_name}
📱 *Telefone:* ${order.customer_phone}
📦 *Tipo:* ${orderTypeText}

🛒 *ITENS DO PEDIDO:*
${itemsList}

━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* ${formatCurrency(order.subtotal)}${order.discount > 0 ? `\n🎫 *Desconto:* -${formatCurrency(order.discount)}` : ""}${order.delivery_fee > 0 ? `\n🛵 *Taxa de Entrega:* ${formatCurrency(order.delivery_fee)}` : ""}
💵 *TOTAL:* ${formatCurrency(order.total)}
💳 *Pagamento:* ${paymentText}${addressText}${order.notes ? `\n\n📝 *Observações:* ${order.notes}` : ""}

━━━━━━━━━━━━━━━━━━
Olá! Gostaria de acompanhar meu pedido! 🙂`;

              const encodedMessage = encodeURIComponent(message);
              window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, "_blank");
            }}
          >
            <MessageCircle className="w-5 h-5" />
            Acompanhar Pedido no WhatsApp
          </Button>
        )}

        {/* Back Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/cardapio/${slug}`)}
        >
        Fazer Novo Pedido
          </Button>
        </div>

        {/* Post-Order Review Modal */}
        <PostOrderReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          storeId={order.store_id}
          storeName={storeSettings?.name || ""}
          customerName={order.customer_name}
          customerPhone={order.customer_phone}
          orderNumber={order.order_number}
        />
      </div>
    );
  }
