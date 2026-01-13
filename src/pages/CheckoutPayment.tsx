import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Check, CreditCard, Banknote, QrCode, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';

interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  icon_type: string;
  is_active: boolean;
  requires_change: boolean;
  display_order: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  pix: QrCode,
  money: Banknote,
};

export default function CheckoutPayment() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { incompleteOrder, updateIncompleteOrder } = useCart();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);
  const [changeFor, setChangeFor] = useState('');
  const [noChange, setNoChange] = useState(false);
  const [requiresChange, setRequiresChange] = useState(false);

  // Fetch store to get store_id
  const { data: store } = useQuery({
    queryKey: ["store", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch payment methods from database
  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["payment_methods", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!store?.id,
  });

  useEffect(() => { 
    if (!incompleteOrder?.customerName) {
      navigate(`/cardapio/${slug}/finalizar/endereco`);
    }
  }, [incompleteOrder, navigate, slug]);

  // Calculate total with delivery fee and applied coupon discount
  const baseDeliveryFee = incompleteOrder?.serviceType === "delivery" 
    ? (incompleteOrder?.deliveryArea?.fee ?? 0) 
    : 0;
  const couponDiscount = incompleteOrder?.coupon?.discountAmount || 0;
  const hasFreeShipping = incompleteOrder?.coupon?.discount_type === "free_shipping" || 
                          incompleteOrder?.coupon?.discount_type === "combined";
  const deliveryFee = hasFreeShipping ? 0 : baseDeliveryFee;
  const subtotal = incompleteOrder?.totalPrice || 0;
  const totalAmount = Math.max(0, subtotal + deliveryFee - couponDiscount);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    setSelectedMethodName(method.name);
    setRequiresChange(method.requires_change);
    if (!method.requires_change) {
      setChangeFor('');
      setNoChange(false);
    }
  };

  const handleNext = () => {
    updateIncompleteOrder({ 
      paymentMethod: selectedMethodName || '', 
      changeAmount: requiresChange && !noChange ? parseFloat(changeFor) : undefined 
    });
    navigate(`/cardapio/${slug}/finalizar/resumo`);
  };

  const changeForValue = parseFloat(changeFor);
  const isValidChange = !isNaN(changeForValue) && changeForValue >= totalAmount;
  const isValid = selectedMethod && (
    !requiresChange || 
    noChange || 
    (changeFor && isValidChange)
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/cardapio/${slug}/finalizar/endereco`)} 
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold">Forma de Pagamento</h1>
              <p className="text-xs text-muted-foreground">Como deseja pagar?</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          paymentMethods.map((method, index) => {
            const IconComponent = ICON_MAP[method.icon_type] || Banknote;
            return (
              <motion.button 
                key={method.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelectMethod(method)} 
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === method.id 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground">{method.name}</p>
                  {method.description && (
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  )}
                </div>
                {selectedMethod === method.id && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </motion.button>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma forma de pagamento disponível</p>
            <p className="text-sm">Entre em contato com o estabelecimento</p>
          </div>
        )}
        
        {/* Campo de troco para métodos que exigem */}
        {requiresChange && selectedMethod && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-card rounded-xl border border-border p-4 space-y-3"
          >
            <p className="text-sm font-medium text-foreground">Precisa de troco?</p>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox 
                checked={noChange} 
                onCheckedChange={(c) => {
                  setNoChange(!!c);
                  if (c) setChangeFor('');
                }} 
              />
              <span className="text-sm text-muted-foreground">Não preciso de troco</span>
            </label>
            
            {!noChange && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total do pedido: {formatCurrency(totalAmount)}
                </p>
                <Input 
                  type="number" 
                  value={changeFor} 
                  onChange={(e) => setChangeFor(e.target.value)} 
                  placeholder={`Troco para quanto? (mín ${formatCurrency(totalAmount)})`}
                  className="h-11"
                />
                {changeFor && (isNaN(parseFloat(changeFor)) || parseFloat(changeFor) < totalAmount) && (
                  <p className="text-xs text-destructive mt-1">
                    O valor deve ser maior ou igual a {formatCurrency(totalAmount)}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom">
        <div className="max-w-lg mx-auto">
          <Button 
            onClick={handleNext} 
            disabled={!isValid} 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-base"
          >
            Revisar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
