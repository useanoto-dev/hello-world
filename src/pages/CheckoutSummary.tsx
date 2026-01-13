import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart, AppliedCoupon } from "@/contexts/CartContext";
import { useStoreStatus } from "@/contexts/StoreStatusContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { 
  ArrowLeft, MapPin, CreditCard, ShoppingBag, Truck, Store, 
  UtensilsCrossed, Check, TicketPercent, X, Loader2, CheckCircle, AlertCircle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OrderSuccessAnimation } from "@/components/checkout/OrderSuccessAnimation";
import { LoyaltyRedemption } from "@/components/checkout/LoyaltyRedemption";

interface AppliedReward {
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
}

const serviceIcons = {
  delivery: Truck,
  pickup: Store,
  dine_in: UtensilsCrossed,
};

const serviceLabels = {
  delivery: "Delivery",
  pickup: "Retirada no Local",
  dine_in: "Consumir no Local",
};

// Payment method is now stored as the name directly from the database

export default function CheckoutSummary() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { incompleteOrder, clearCart, clearIncompleteOrder, updateIncompleteOrder } = useCart();
  const { isOpen: isStoreOpen, nextOpeningTime } = useStoreStatus();
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<number | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<number | null>(null);
  const [orderCompleted, setOrderCompleted] = useState(false); // Prevents redirect guards
  
  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    incompleteOrder?.coupon || null
  );
  
  // Loyalty reward state
  const [appliedReward, setAppliedReward] = useState<AppliedReward | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  const { data: store } = useQuery({
    queryKey: ["store", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Redireciona se não tiver dados obrigatórios (mas não durante/após conclusão do pedido)
  if (!orderCompleted && !showSuccessAnimation) {
    if (!incompleteOrder?.paymentMethod) {
      navigate(`/cardapio/${slug}/finalizar/pagamento`);
      return null;
    }

    if (!incompleteOrder?.cart?.length) {
      navigate(`/cardapio/${slug}`);
      return null;
    }
  }

  // Check if coupon includes free shipping (free_shipping or combined)
  const hasFreeShipping = appliedCoupon?.discount_type === "free_shipping" || appliedCoupon?.discount_type === "combined";
  // Check if coupon is delivery discount
  const isDeliveryDiscount = appliedCoupon?.discount_type === "delivery_discount";
  
  // Use delivery area fee if selected, otherwise use store default
  const deliveryAreaFee = incompleteOrder.deliveryArea?.fee;
  const baseDeliveryFee = incompleteOrder.serviceType === "delivery" 
    ? (deliveryAreaFee !== undefined ? deliveryAreaFee : (store?.delivery_fee || 0)) 
    : 0;
  
  // Calculate delivery fee based on coupon type
  let deliveryFee = baseDeliveryFee;
  let deliveryDiscount = 0;
  if (hasFreeShipping) {
    deliveryFee = 0;
  } else if (isDeliveryDiscount && appliedCoupon) {
    deliveryDiscount = (baseDeliveryFee * appliedCoupon.discount_value) / 100;
    deliveryFee = Math.max(0, baseDeliveryFee - deliveryDiscount);
  }
  
  const deliveryAreaMinOrder = incompleteOrder.deliveryArea?.min_order_value;
  const minOrderValue = deliveryAreaMinOrder !== undefined && deliveryAreaMinOrder > 0 
    ? deliveryAreaMinOrder 
    : (store?.min_order_value || 0);
  const subtotal = incompleteOrder.totalPrice || 0;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const loyaltyDiscount = appliedReward?.discountAmount || 0;
  // Limit discount to subtotal to ensure customer always pays delivery fee
  const maxDiscount = subtotal;
  const discount = Math.min(couponDiscount + loyaltyDiscount, maxDiscount);
  const total = subtotal + deliveryFee - discount;
  const isMinOrderMet = subtotal >= minOrderValue;


  // Validate and apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !store) return;
    
    setIsValidatingCoupon(true);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("store_id", store.id)
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!coupon) {
        toast.error("Cupom não encontrado ou inválido");
        return;
      }
      
      // Check validity dates
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        toast.error("Este cupom ainda não está válido");
        return;
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast.error("Este cupom expirou");
        return;
      }
      
      // Check max uses
      if (coupon.max_uses && (coupon.uses_count || 0) >= coupon.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return;
      }
      
      // Check max uses per customer (by phone)
      if (coupon.max_uses_per_customer && incompleteOrder?.customerPhone) {
        const cleanPhone = incompleteOrder.customerPhone.replace(/\D/g, '');
        const { data: usageData } = await supabase
          .from("coupon_usages")
          .select("id")
          .eq("coupon_id", coupon.id)
          .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.${incompleteOrder.customerPhone}`);
        
        if (usageData && usageData.length >= coupon.max_uses_per_customer) {
          toast.error(`Você já usou este cupom ${coupon.max_uses_per_customer} vez(es)`);
          return;
        }
      }
      
      // Check min order value
      if (coupon.min_order_value && subtotal < coupon.min_order_value) {
        toast.error(`Pedido mínimo de ${formatCurrency(coupon.min_order_value)} para usar este cupom`);
        return;
      }
      
      // Calculate discount
      let discountAmount = 0;
      let includesFreeShipping = false;
      
      if (coupon.discount_type === "free_shipping") {
        includesFreeShipping = true;
        discountAmount = 0; // Will be handled separately
      } else if (coupon.discount_type === "combined") {
        // Combined: percentage discount + free shipping
        includesFreeShipping = true;
        discountAmount = (subtotal * coupon.discount_value) / 100;
        discountAmount = Math.min(discountAmount, subtotal);
      } else if (coupon.discount_type === "delivery_discount") {
        // Delivery discount: percentage off delivery fee (handled in deliveryFee calculation)
        discountAmount = 0; // Discount is applied to delivery fee, not subtotal
      } else if (coupon.discount_type === "percentage") {
        discountAmount = (subtotal * coupon.discount_value) / 100;
        discountAmount = Math.min(discountAmount, subtotal);
      } else {
        discountAmount = Math.min(coupon.discount_value, subtotal);
      }
      
      const appliedData: AppliedCoupon = {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type || "percentage",
        discount_value: coupon.discount_value,
        discountAmount,
      };
      
      setAppliedCoupon(appliedData);
      updateIncompleteOrder({ coupon: appliedData });
      setCouponCode("");
      
      if (coupon.discount_type === "free_shipping") {
        toast.success(`Cupom aplicado! Frete grátis 🚚`);
      } else if (coupon.discount_type === "combined") {
        toast.success(`Cupom aplicado! ${coupon.discount_value}% OFF + Frete grátis 🎁`);
      } else if (coupon.discount_type === "delivery_discount") {
        toast.success(`Cupom aplicado! ${coupon.discount_value}% OFF no frete 🚚`);
      } else {
        toast.success(`Cupom aplicado! Desconto de ${formatCurrency(discountAmount)}`);
      }
      
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast.error("Erro ao validar cupom");
    } finally {
      setIsValidatingCoupon(false);
    }
  };
  
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    updateIncompleteOrder({ coupon: null });
    toast.success("Cupom removido");
  };

  const ServiceIcon = serviceIcons[incompleteOrder.serviceType || "delivery"];


  const handleSubmitOrder = async () => {
    if (!store) {
      toast.error("Loja não encontrada");
      return;
    }

    if (!isMinOrderMet) {
      toast.error(`Pedido mínimo de ${formatCurrency(minOrderValue)}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepara dados do pedido
      const orderData = {
        store_id: store.id,
        customer_name: incompleteOrder.customerName || "",
        customer_phone: incompleteOrder.customerPhone || "",
        order_type: incompleteOrder.serviceType || "delivery",
        items: incompleteOrder.cart as unknown as import("@/integrations/supabase/types").Json,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        total: total,
        address: incompleteOrder.serviceType === "delivery" 
          ? (incompleteOrder.address || null) as unknown as import("@/integrations/supabase/types").Json
          : null,
        payment_method: incompleteOrder.paymentMethod || null,
        payment_change: incompleteOrder.changeAmount || null,
        notes: [
          appliedCoupon ? `[Cupom: ${appliedCoupon.code}]` : '',
          appliedReward ? `[Fidelidade: ${appliedReward.rewardName} - ${appliedReward.pointsUsed} pts]` : '',
          incompleteOrder.tableNumber ? `[Mesa: ${incompleteOrder.tableNumber}]` : '',
          observations
        ].filter(Boolean).join(' ').trim() || null,
        status: "pending",
      };

      // Salva pedido no banco
      const { data: insertedOrder, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select("id, order_number")
        .single();

      if (error) {
        console.error("Erro ao salvar pedido:", error);
        throw error;
      }

      // Incrementa uso do cupom e registra uso por cliente
      if (appliedCoupon && store && insertedOrder?.id) {
        // Fetch current uses_count and increment atomically
        const { data: currentCoupon } = await supabase
          .from("coupons")
          .select("uses_count")
          .eq("id", appliedCoupon.id)
          .single();
        
        await supabase
          .from("coupons")
          .update({ uses_count: (currentCoupon?.uses_count || 0) + 1 })
          .eq("id", appliedCoupon.id);
        
        // Record customer usage with proper order_id
        const cleanPhone = (incompleteOrder.customerPhone || '').replace(/\D/g, '');
        await supabase
          .from("coupon_usages")
          .insert({
            coupon_id: appliedCoupon.id,
            store_id: store.id,
            customer_phone: cleanPhone,
            order_id: insertedOrder.id
          });
      }

      // Process loyalty reward redemption
      if (appliedReward && store) {
        const cleanPhone = (incompleteOrder.customerPhone || '').replace(/\D/g, '');
        
        // Deduct points from customer
        const { data: currentPoints } = await supabase
          .from("customer_points")
          .select("total_points")
          .eq("store_id", store.id)
          .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.${incompleteOrder.customerPhone}`)
          .maybeSingle();
        
        if (currentPoints) {
          await supabase
            .from("customer_points")
            .update({ 
              total_points: Math.max(0, currentPoints.total_points - appliedReward.pointsUsed),
              updated_at: new Date().toISOString()
            })
            .eq("store_id", store.id)
            .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.${incompleteOrder.customerPhone}`);
        }
        
        // Record the redemption transaction
        await supabase
          .from("point_transactions")
          .insert({
            store_id: store.id,
            customer_phone: cleanPhone,
            points: -appliedReward.pointsUsed,
            type: "redeemed",
            description: `Resgate: ${appliedReward.rewardName} - Pedido #${insertedOrder.order_number}`,
            reward_id: appliedReward.rewardId,
            order_id: insertedOrder.id
          });
        
        // Increment reward redemptions count
        const { data: rewardData } = await supabase
          .from("loyalty_rewards")
          .select("redemptions_count")
          .eq("id", appliedReward.rewardId)
          .maybeSingle();
        
        await supabase
          .from("loyalty_rewards")
          .update({ redemptions_count: (rewardData?.redemptions_count || 0) + 1 })
          .eq("id", appliedReward.rewardId);
      }

      // Auto-enroll customer in loyalty program if CPF is provided
      const customerCpf = incompleteOrder.customerCpf?.replace(/\D/g, '');
      if (customerCpf && customerCpf.length === 11) {
        try {
          // Check if loyalty program is enabled for this store
          const { data: loyaltySettings } = await supabase
            .from("loyalty_settings")
            .select("is_enabled, points_per_currency, min_order_for_points, welcome_bonus, tiers_enabled, tier_bronze_min, tier_silver_min, tier_gold_min")
            .eq("store_id", store.id)
            .maybeSingle();

          if (loyaltySettings?.is_enabled) {
            const cleanPhone = (incompleteOrder.customerPhone || '').replace(/\D/g, '');
            const customerName = incompleteOrder.customerName || '';
            
            // Check if customer already exists by CPF
            const { data: existingCustomer } = await supabase
              .from("customer_points")
              .select("id, total_points, lifetime_points")
              .eq("store_id", store.id)
              .eq("customer_cpf", customerCpf)
              .maybeSingle();

            // Calculate points to award (based on subtotal, not total with discounts)
            const minOrderForPoints = loyaltySettings.min_order_for_points || 0;
            let pointsToAward = 0;
            
            if (subtotal >= minOrderForPoints) {
              pointsToAward = Math.floor(subtotal * (loyaltySettings.points_per_currency || 1));
            }

            if (existingCustomer) {
              // Customer exists - add points
              const newTotalPoints = existingCustomer.total_points + pointsToAward;
              const newLifetimePoints = existingCustomer.lifetime_points + pointsToAward;

              // Calculate tier if tiers are enabled
              let newTier = 'bronze';
              if (loyaltySettings.tiers_enabled) {
                if (newLifetimePoints >= (loyaltySettings.tier_gold_min || 1500)) {
                  newTier = 'gold';
                } else if (newLifetimePoints >= (loyaltySettings.tier_silver_min || 500)) {
                  newTier = 'silver';
                }
              }

              await supabase
                .from("customer_points")
                .update({
                  total_points: newTotalPoints,
                  lifetime_points: newLifetimePoints,
                  tier: newTier,
                  customer_phone: cleanPhone, // Update phone if changed
                  customer_name: customerName, // Update name if changed
                  updated_at: new Date().toISOString()
                })
                .eq("id", existingCustomer.id);

              // Record the earn transaction
              if (pointsToAward > 0) {
                await supabase
                  .from("point_transactions")
                  .insert({
                    store_id: store.id,
                    customer_phone: cleanPhone,
                    customer_cpf: customerCpf,
                    points: pointsToAward,
                    type: "earned",
                    description: `Pedido #${insertedOrder.order_number} - R$ ${subtotal.toFixed(2)}`
                  });
              }
              
              // Set points for animation display
              setPointsEarned(pointsToAward);
            } else {
              // New customer - create record with welcome bonus
              const welcomeBonus = loyaltySettings.welcome_bonus || 0;
              const totalInitialPoints = pointsToAward + welcomeBonus;

              await supabase
                .from("customer_points")
                .insert({
                  store_id: store.id,
                  customer_phone: cleanPhone,
                  customer_cpf: customerCpf,
                  customer_name: customerName,
                  total_points: totalInitialPoints,
                  lifetime_points: totalInitialPoints,
                  tier: 'bronze'
                });

              // Record welcome bonus transaction if applicable
              if (welcomeBonus > 0) {
                await supabase
                  .from("point_transactions")
                  .insert({
                    store_id: store.id,
                    customer_phone: cleanPhone,
                    customer_cpf: customerCpf,
                    points: welcomeBonus,
                    type: "bonus",
                    description: "Bônus de boas-vindas"
                  });
              }

              // Record the earn transaction
              if (pointsToAward > 0) {
                await supabase
                  .from("point_transactions")
                  .insert({
                    store_id: store.id,
                    customer_phone: cleanPhone,
                    customer_cpf: customerCpf,
                    points: pointsToAward,
                    type: "earned",
                    description: `Pedido #${insertedOrder.order_number} - R$ ${subtotal.toFixed(2)}`
                  });
              }
              
              // Set points for animation display (including welcome bonus)
              setPointsEarned(totalInitialPoints);
            }
          }
        } catch (loyaltyError) {
          // Don't fail the order if loyalty processing fails
          console.error("Erro ao processar fidelidade:", loyaltyError);
        }
      }

      // Send automatic WhatsApp confirmation via notificarNovoPedido (uses custom messages from database)
      try {
        supabase.functions.invoke("notificarNovoPedido", {
          body: { pedido_id: insertedOrder.id }
        }).then(({ data, error }) => {
          if (error) {
            console.log("WhatsApp notification not sent:", error);
          } else if (data?.success) {
            console.log("WhatsApp notification sent successfully", data.usou_mensagem_personalizada ? "(mensagem personalizada)" : "(mensagem padrão)");
          }
        });
      } catch (whatsappError) {
        // Don't fail the order if WhatsApp fails
        console.log("WhatsApp notification skipped:", whatsappError);
      }

      // Marca como completo ANTES de limpar (para evitar redirects dos guards)
      setOrderCompleted(true);
      setPendingOrderNumber(insertedOrder.order_number);
      setShowSuccessAnimation(true);
      
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      toast.error("Erro ao processar pedido. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  // Gera mensagem formatada como comanda para WhatsApp
  const generateWhatsAppMessage = useCallback((orderNum: number) => {
    const items = incompleteOrder.cart || [];
    const serviceLabel = serviceLabels[incompleteOrder.serviceType || "delivery"];
    
    let message = `🧾 *PEDIDO #${orderNum}*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Cliente
    message += `👤 *Cliente:* ${incompleteOrder.customerName}\n`;
    message += `📞 *Telefone:* ${incompleteOrder.customerPhone}\n`;
    message += `📦 *Tipo:* ${serviceLabel}\n`;
    
    // Mesa (se consumo local)
    if (incompleteOrder.serviceType === "dine_in" && incompleteOrder.tableNumber) {
      message += `🪑 *Mesa:* ${incompleteOrder.tableNumber}\n`;
    }
    
    // Endereço (se delivery)
    if (incompleteOrder.serviceType === "delivery" && incompleteOrder.address) {
      const addr = incompleteOrder.address;
      message += `\n📍 *Endereço:*\n`;
      if (addr.neighborhood) message += `${addr.neighborhood}\n`;
      message += `${addr.street}, ${addr.number}`;
      if (addr.complement) message += ` - ${addr.complement}`;
      message += `\n`;
      if (addr.reference) message += `Ref: ${addr.reference}\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `📋 *ITENS DO PEDIDO*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Itens
    items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      message += `${item.quantity}x ${item.name}\n`;
      
      // Detalhes do item (descrição ou extras de pizza)
      if (item.description) {
        message += `   _${item.description}_\n`;
      } else if (item.category === "pizzas") {
        if (item.size) message += `   📏 ${item.size}\n`;
        if (item.flavors?.length) {
          message += `   🍕 ${item.flavors.map(f => f.name).join(" / ")}\n`;
        }
        if (item.extras?.border?.name) {
          message += `   🔘 Borda: ${item.extras.border.name}\n`;
        }
      }
      
      message += `   💰 ${formatCurrency(itemTotal)}\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `💳 *PAGAMENTO*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `*Forma:* ${incompleteOrder.paymentMethod}\n`;
    if (incompleteOrder.changeAmount) {
      message += `*Troco para:* ${formatCurrency(incompleteOrder.changeAmount)}\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `💵 *VALORES*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `Subtotal: ${formatCurrency(subtotal)}\n`;
    
    if (appliedCoupon && appliedCoupon.discountAmount > 0) {
      message += `Desconto (${appliedCoupon.code}): -${formatCurrency(appliedCoupon.discountAmount)}\n`;
    }
    
    if (appliedReward && appliedReward.discountAmount > 0) {
      message += `Fidelidade (${appliedReward.pointsUsed} pts): -${formatCurrency(appliedReward.discountAmount)}\n`;
    }
    
    if (incompleteOrder.serviceType === "delivery") {
      if (deliveryFee > 0) {
        message += `Taxa de Entrega: ${formatCurrency(deliveryFee)}\n`;
      } else {
        message += `Taxa de Entrega: GRÁTIS 🎉\n`;
      }
    }
    
    message += `\n*TOTAL: ${formatCurrency(total)}*\n`;
    
    // Observações
    if (observations) {
      message += `\n📝 *Obs:* ${observations}\n`;
    }
    
    // Link de acompanhamento (apenas se modo comandas estiver ativo)
    const useComandaMode = (store as any)?.use_comanda_mode !== false;
    if (useComandaMode) {
      const baseUrl = window.location.origin;
      const trackingUrl = `${baseUrl}/cardapio/${slug}/pedido/${orderNum}`;
      
      message += `\n━━━━━━━━━━━━━━━━━━\n`;
      message += `📲 *Acompanhe seu pedido por aqui:*\n`;
      message += trackingUrl;
    }
    
    return message;
  }, [incompleteOrder, subtotal, appliedCoupon, deliveryFee, total, observations, slug]);

  const handleAnimationComplete = useCallback(() => {
    // Limpa carrinho apenas quando a animação termina
    clearCart();
    clearIncompleteOrder();
    setShowSuccessAnimation(false);
    
    // Gera mensagem e redireciona para WhatsApp
    if (store?.whatsapp && pendingOrderNumber) {
      const message = generateWhatsAppMessage(pendingOrderNumber);
      const whatsappNumber = store.whatsapp.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
    
    // Navega baseado no modo de comandas
    const useComandaMode = (store as any)?.use_comanda_mode !== false;
    if (useComandaMode) {
      // Modo comandas: vai para página de acompanhamento
      navigate(`/cardapio/${slug}/pedido/${pendingOrderNumber}`);
    } else {
      // Modo simples: volta para o cardápio
      navigate(`/cardapio/${slug}`);
    }
  }, [navigate, slug, pendingOrderNumber, clearCart, clearIncompleteOrder, store, generateWhatsAppMessage]);

  // Verifica se está no modo simples (não usa comandas)
  const isSimpleMode = store?.use_comanda_mode === false;

  return (
    <>
      <OrderSuccessAnimation 
        isVisible={showSuccessAnimation}
        onComplete={handleAnimationComplete}
        orderNumber={pendingOrderNumber || undefined}
        isSimpleMode={isSimpleMode}
        pointsEarned={pointsEarned}
      />
      
      <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/cardapio/${slug}/finalizar/pagamento`)}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold">Resumo do Pedido</h1>
              <p className="text-xs text-muted-foreground">Revise antes de enviar</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Dados do Cliente e Serviço */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <ServiceIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {serviceLabels[incompleteOrder.serviceType || "delivery"]}
              </p>
              <p className="text-sm text-muted-foreground">{incompleteOrder.customerName}</p>
            </div>
          </div>

          {incompleteOrder.serviceType === "dine_in" && incompleteOrder.tableNumber && (
            <p className="text-sm text-muted-foreground pl-13">
              🪑 Mesa: {incompleteOrder.tableNumber}
            </p>
          )}

          {incompleteOrder.serviceType === "delivery" && incompleteOrder.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div>
                {incompleteOrder.address.neighborhood && (
                  <p className="font-medium text-foreground">{incompleteOrder.address.neighborhood}</p>
                )}
                {incompleteOrder.address.street}, {incompleteOrder.address.number}
                {incompleteOrder.address.complement && ` - ${incompleteOrder.address.complement}`}
                {incompleteOrder.address.reference && (
                  <p className="text-xs mt-0.5">Ref: {incompleteOrder.address.reference}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
            <CreditCard className="w-4 h-4 text-primary" />
            <span>{incompleteOrder.paymentMethod}</span>
            {incompleteOrder.changeAmount && (
              <span className="text-xs">(Troco para {formatCurrency(incompleteOrder.changeAmount)})</span>
            )}
          </div>
        </motion.section>

        {/* Itens do Pedido */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Itens do Pedido</h2>
            <span className="text-xs text-muted-foreground">({incompleteOrder.cart?.length} itens)</span>
          </div>

          <div className="space-y-3">
            {incompleteOrder.cart?.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex justify-between items-start py-2 border-b border-border last:border-0 last:pb-0">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.quantity}x {item.name}</p>
                  {item.category === "pizzas" && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {item.size && <p>📏 {item.size}</p>}
                      {item.flavors?.length && <p>🍕 {item.flavors.map(f => f.name).join(" / ")}</p>}
                      {item.extras?.border && <p>🔘 Borda: {item.extras.border.name}</p>}
                    </div>
                  )}
                </div>
                <span className="font-medium text-foreground whitespace-nowrap">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Cupom de Desconto */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <TicketPercent className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Cupom de Desconto</h2>
          </div>
          
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div>
                <p className="font-mono font-bold text-green-600">{appliedCoupon.code}</p>
                <p className="text-sm text-green-600">
                  {appliedCoupon.discount_type === "free_shipping" ? (
                    <>🚚 Frete Grátis</>
                  ) : appliedCoupon.discount_type === "combined" ? (
                    <>🎁 -{appliedCoupon.discount_value}% + Frete Grátis ({formatCurrency(appliedCoupon.discountAmount)})</>
                  ) : appliedCoupon.discount_type === "delivery_discount" ? (
                    <>🚚 -{appliedCoupon.discount_value}% no Frete</>
                  ) : appliedCoupon.discount_type === "percentage" ? (
                    <>-{appliedCoupon.discount_value}% ({formatCurrency(appliedCoupon.discountAmount)})</>
                  ) : (
                    <>-{formatCurrency(appliedCoupon.discount_value)} ({formatCurrency(appliedCoupon.discountAmount)})</>
                  )}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRemoveCoupon}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="font-mono uppercase h-10"
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              />
              <Button 
                onClick={handleApplyCoupon} 
                disabled={isValidatingCoupon || !couponCode.trim()}
                variant="secondary"
                className="shrink-0"
              >
                {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
          )}
        </motion.section>

        {/* Loyalty Redemption */}
        {store && (
          <LoyaltyRedemption
            storeId={store.id}
            customerCpf={incompleteOrder.customerCpf}
            subtotal={subtotal}
            onRewardApplied={setAppliedReward}
            appliedReward={appliedReward}
            onCpfChange={(cpf) => updateIncompleteOrder({ customerCpf: cpf })}
          />
        )}

        {/* Observações */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <Label htmlFor="observations" className="text-sm font-medium">Observações (opcional)</Label>
          <Textarea
            id="observations"
            placeholder="Alguma observação sobre seu pedido? Ex: sem cebola, bem passado..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </motion.section>

        {/* Totais */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-4 space-y-2"
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          {appliedCoupon && appliedCoupon.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Cupom ({appliedCoupon.code})</span>
              <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
            </div>
          )}
          {appliedReward && appliedReward.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span>Fidelidade ({appliedReward.pointsUsed} pts)</span>
              <span>-{formatCurrency(appliedReward.discountAmount)}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Taxa de Entrega
                {incompleteOrder.deliveryArea && (
                  <span className="text-xs ml-1">({incompleteOrder.deliveryArea.name})</span>
                )}
              </span>
              <span className="text-foreground">
                {isDeliveryDiscount && deliveryDiscount > 0 ? (
                  <>
                    <span className="line-through text-muted-foreground mr-2">{formatCurrency(baseDeliveryFee)}</span>
                    <span className="text-green-600">{formatCurrency(deliveryFee)}</span>
                  </>
                ) : (
                  formatCurrency(deliveryFee)
                )}
              </span>
            </div>
          )}
          {isDeliveryDiscount && deliveryDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto no Frete ({appliedCoupon?.code})</span>
              <span>-{formatCurrency(deliveryDiscount)}</span>
            </div>
          )}
          {deliveryFee === 0 && incompleteOrder.serviceType === "delivery" && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Entrega Grátis
                {hasFreeShipping && baseDeliveryFee > 0 && (
                  <span className="text-xs ml-1 line-through text-muted-foreground">
                    ({formatCurrency(baseDeliveryFee)})
                  </span>
                )}
              </span>
              <span>R$ 0,00</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
          
          {/* Minimum Order Warning */}
          {!isMinOrderMet && minOrderValue > 0 && (
            <div className="flex items-center gap-2 p-3 mt-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Pedido mínimo de {formatCurrency(minOrderValue)}. Faltam {formatCurrency(minOrderValue - subtotal)}.</span>
            </div>
          )}
        </motion.section>
      </div>

      {/* Botão de Concluir Pedido Fixo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom">
        <div className="max-w-lg mx-auto">
          {!isStoreOpen && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Estabelecimento fechado. {nextOpeningTime || "Não é possível finalizar pedidos."}</span>
            </div>
          )}
          <Button 
            onClick={handleSubmitOrder}
            disabled={isSubmitting || !isMinOrderMet || !isStoreOpen}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-base gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : !isStoreOpen ? (
              <>
                <Clock className="w-5 h-5" />
                Estabelecimento Fechado
              </>
            ) : !isMinOrderMet ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Pedido mínimo: {formatCurrency(minOrderValue)}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Concluir Pedido
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
