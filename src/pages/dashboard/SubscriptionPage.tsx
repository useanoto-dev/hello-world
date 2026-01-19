import { motion } from "framer-motion";
import { Check, Shield, Zap, Crown, Star, ArrowLeft, Loader2, Settings, ExternalLink, QrCode, Copy, RefreshCw, CreditCard, Barcode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  background: "#FDFDFD",
  backgroundAlt: "#FFFFFF",
  foreground: "#1D1D1F",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  primaryLight: "#FFF8E1",
  muted: "#86868B",
  border: "rgba(0, 0, 0, 0.04)",
  success: "#34C759",
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { restaurantId } = useActiveRestaurant();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<"monthly" | "annual" | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isRegeneratingPix, setIsRegeneratingPix] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [pixData, setPixData] = useState<{
    qrCode: string;
    code: string;
    expiresAt: string;
    amount: number;
  } | null>(null);
  const [subscription, setSubscription] = useState<{
    status: string;
    plan?: string;
    trial_ends_at?: string;
    current_period_end?: string;
    payment_method?: string;
    pix_qr_code_url?: string;
    pix_code?: string;
    pix_expires_at?: string;
  } | null>(null);

  // Check for success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t('subscription.success'));
      // Refresh subscription data
      fetchSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info(t('subscription.canceled'));
    }
  }, [searchParams, t]);

  // Fetch subscription status
  const fetchSubscription = async () => {
    if (!restaurantId) return;
    
    const { data } = await supabase
      .from('subscriptions')
      .select('status, plan, trial_ends_at, current_period_end, payment_method, pix_qr_code_url, pix_code, pix_expires_at')
      .eq('store_id', restaurantId)
      .single();
    
    if (data) {
      setSubscription(data as typeof subscription);
      
      // If there's pending PIX data (status may be pending_payment which is not in the enum)
      const statusStr = data.status as string;
      if (data.payment_method === 'pix' && data.pix_qr_code_url && statusStr === 'pending_payment') {
        setPixData({
          qrCode: data.pix_qr_code_url,
          code: data.pix_code || '',
          expiresAt: data.pix_expires_at || '',
          amount: data.plan === 'annual' ? 1716 : 179.90,
        });
        setPaymentMethod('pix');
      }
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [restaurantId]);

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    if (!restaurantId) {
      toast.error(t('subscription.noStore'));
      return;
    }

    setIsLoading(plan);

    try {
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      
      if (paymentMethod === 'pix') {
        // PIX flow
        const { data, error } = await supabase.functions.invoke('pix-create-subscription', {
          body: {
            plan,
            storeId: restaurantId,
            email: user?.email,
          },
        });

        if (error) throw error;
        
        if (data?.success) {
          setPixData({
            qrCode: data.pixQrCode,
            code: data.pixCode,
            expiresAt: data.expiresAt,
            amount: data.amount,
          });
          toast.success('QR Code PIX gerado com sucesso!');
          fetchSubscription();
        }
      } else {
        // Card/Boleto flow - redirect to Stripe Checkout
        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
          body: {
            plan,
            storeId: restaurantId,
            email: user?.email,
          },
        });

        if (error) throw error;
        
        if (data?.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(t('subscription.error'));
    } finally {
      setIsLoading(null);
    }
  };

  const handleRegeneratePixCode = async () => {
    if (!restaurantId) return;

    setIsRegeneratingPix(true);

    try {
      const { data, error } = await supabase.functions.invoke('pix-regenerate-qrcode', {
        body: { storeId: restaurantId },
      });

      if (error) throw error;
      
      if (data?.success) {
        setPixData({
          qrCode: data.pixQrCode,
          code: data.pixCode,
          expiresAt: data.expiresAt,
          amount: subscription?.plan === 'annual' ? 1716 : 179.90,
        });
        toast.success('Novo QR Code gerado!');
        fetchSubscription();
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error('Erro ao gerar novo QR Code');
    } finally {
      setIsRegeneratingPix(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.code) {
      navigator.clipboard.writeText(pixData.code);
      toast.success('Código PIX copiado!');
    }
  };

  const handleManageSubscription = async () => {
    if (!restaurantId) return;

    setIsPortalLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: {
          storeId: restaurantId,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error(t('subscription.portalError'));
    } finally {
      setIsPortalLoading(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return null;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing' || (!subscription?.status);
  const trialDays = getTrialDaysRemaining();

  const monthlyFeatures = [
    t('subscription.features.unlimitedMenu'),
    t('subscription.features.unlimitedOrders'),
    t('subscription.features.zeroFee'),
    t('subscription.features.whatsappSupport'),
    t('subscription.features.dashboard'),
    t('subscription.features.qrCode'),
  ];

  const annualFeatures = [
    t('subscription.features.allMonthly'),
    t('subscription.features.prioritySupport'),
    t('subscription.features.launchConsulting'),
    t('subscription.features.premiumTheme'),
    t('subscription.features.advancedReports'),
    t('subscription.features.whatsappApi'),
  ];


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{t('subscription.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('subscription.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge 
            className="mb-3 px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${COLORS.primary}20`, color: COLORS.primaryDark }}
          >
            {t('subscription.fairPrice')}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            {t('subscription.investTitle')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('subscription.noOrderFee')}
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* Plano Mensal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="order-2 md:order-1"
          >
            <Card 
              className="h-full relative overflow-hidden"
              style={{ backgroundColor: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: `1px solid ${COLORS.border}` }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: COLORS.foreground }}>
                    {t('subscription.monthlyPlan')}
                  </h3>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: COLORS.backgroundAlt, color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
                  >
                    {t('subscription.flexible')}
                  </span>
                </div>
                
                <div className="flex items-baseline flex-wrap gap-x-1">
                  <span className="text-4xl font-bold" style={{ color: COLORS.foreground }}>R$ 179</span>
                  <span className="text-lg" style={{ color: COLORS.muted }}>,90</span>
                  <span className="text-sm" style={{ color: COLORS.muted }}>/{t('subscription.month')}</span>
                </div>
                
                <p className="mt-2 text-[11px]" style={{ color: COLORS.muted }}>
                  {t('subscription.monthlyBilling')}
                </p>
                
                <div className="my-4 h-px" style={{ backgroundColor: COLORS.border }} />
                
                <ul className="space-y-2">
                  {monthlyFeatures.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: COLORS.primaryLight }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: COLORS.primaryDark }} />
                      </div>
                      <span className="text-xs" style={{ color: COLORS.foreground }}>{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-5 rounded-full text-xs font-semibold h-10"
                  onClick={() => handleSubscribe("monthly")}
                  disabled={isLoading !== null || isActive}
                  style={{ borderColor: COLORS.border, color: COLORS.foreground }}
                >
                  {isLoading === "monthly" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  ) : null}
                  {isActive ? t('subscription.currentPlan') : t('subscription.subscribeMonthly')}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Plano Anual - Destaque */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-1 md:order-2"
          >
            <Card 
              className="relative h-full overflow-hidden border-0"
              style={{ backgroundColor: COLORS.foreground, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}
            >
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 rounded-b-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              >
                <Star className="w-2.5 h-2.5" />
                {t('subscription.mostChosen')}
              </div>
              
              <div className="p-5 mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-white">{t('subscription.annualPlan')}</h3>
                  </div>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold w-fit"
                    style={{ backgroundColor: COLORS.success, color: "#fff" }}
                  >
                    {t('subscription.saveYear', { amount: '442,80' })}
                  </span>
                </div>
                
                <div className="flex items-baseline flex-wrap gap-x-1">
                  <span className="text-xs line-through" style={{ color: "rgba(255,255,255,0.5)" }}>
                    R$ 179,90
                  </span>
                  <span className="text-4xl font-bold text-white">R$ 143</span>
                  <span className="text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>,00</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>/{t('subscription.month')}</span>
                </div>
                
                <div 
                  className="mt-2 p-2 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <p className="text-[10px] text-white flex flex-wrap items-center gap-1">
                    <span className="font-semibold">{t('subscription.yearlyTotal')}:</span> 
                    <span>R$ 1.716,00</span>
                  </p>
                </div>
                
                <div className="my-4 h-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
                
                <ul className="space-y-2">
                  {annualFeatures.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: COLORS.foreground }} />
                      </div>
                      <span className="text-xs text-white">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  size="sm" 
                  className="w-full mt-5 rounded-full text-xs font-semibold h-10 transition-transform hover:scale-[1.02]"
                  onClick={() => handleSubscribe("annual")}
                  disabled={isLoading !== null || isActive}
                  style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                >
                  {isLoading === "annual" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  ) : null}
                  {isActive ? t('subscription.currentPlan') : t('subscription.subscribeAnnual')}
                </Button>
                
                <p className="text-center mt-2 text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  🔒 {t('subscription.guarantee')}
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Payment Method Selection - PIX disabled until enabled in Stripe */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 max-w-md mx-auto"
          >
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4 text-center">Forma de Pagamento</h3>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "card" | "pix")}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="card"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="card" id="card" className="sr-only" />
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs font-medium">Cartão / Boleto</span>
                  <span className="text-[10px] text-muted-foreground">Automático</span>
                </Label>
                <Label
                  htmlFor="pix"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-not-allowed transition-all opacity-50 border-border"
                  title="PIX não disponível - entre em contato com o suporte"
                >
                  <RadioGroupItem value="pix" id="pix" className="sr-only" disabled />
                  <Smartphone className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">PIX</span>
                  <span className="text-[10px] text-muted-foreground">Em breve</span>
                </Label>
              </RadioGroup>
            </Card>
          </motion.div>
        )}

        {/* PIX QR Code Section */}
        {pixData && (subscription?.status as string) === 'pending_payment' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="p-6 max-w-md mx-auto text-center border-2 border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Pague via PIX</h3>
              </div>
              
              <div className="bg-white p-4 rounded-xl border mb-4">
                {pixData.qrCode.startsWith('http') ? (
                  <img 
                    src={pixData.qrCode} 
                    alt="QR Code PIX"
                    className="mx-auto w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto flex items-center justify-center bg-muted rounded-lg">
                    <a 
                      href={pixData.qrCode} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline text-sm"
                    >
                      Abrir página de pagamento
                    </a>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-primary">
                  R$ {pixData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {subscription?.plan === 'annual' ? 'Plano Anual' : 'Plano Mensal'}
                </p>
              </div>

              {pixData.code && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Código PIX (copia e cola):</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pixData.code}
                      readOnly
                      className="flex-1 text-xs p-2 bg-muted rounded border text-center truncate"
                    />
                    <Button size="sm" variant="outline" onClick={copyPixCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {pixData.expiresAt && (
                <p className="text-xs text-muted-foreground mb-4">
                  Expira {formatDistanceToNow(new Date(pixData.expiresAt), { addSuffix: true, locale: ptBR })}
                </p>
              )}

              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRegeneratePixCode}
                  disabled={isRegeneratingPix}
                >
                  {isRegeneratingPix ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Novo QR Code
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground mt-4">
                Após o pagamento, sua assinatura será ativada automaticamente em até 5 minutos.
              </p>
            </Card>
          </motion.div>
        )}

        {/* Trust badges */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs"
          style={{ color: COLORS.muted }}
        >
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" style={{ color: COLORS.success }} />
            {t('subscription.securePayment')}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" style={{ color: COLORS.primary }} />
            {t('subscription.instantActivation')}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" style={{ color: COLORS.success }} />
            {t('subscription.cancelAnytime')}
          </span>
        </motion.div>

        {/* Current Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <Card className="p-6 bg-muted/30 border-dashed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t('subscription.statusTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {isActive 
                    ? t('subscription.activeDescription', { 
                        plan: subscription?.plan === 'annual' 
                          ? t('subscription.annualPlan') 
                          : subscription?.plan === 'daily' 
                            ? 'Plano Diário' 
                            : t('subscription.monthlyPlan'),
                        date: subscription?.current_period_end 
                          ? new Date(subscription.current_period_end).toLocaleDateString() 
                          : ''
                      })
                    : isTrialing
                      ? t('subscription.trialDescription')
                      : t('subscription.expiredDescription')
                  }
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive 
                      ? t('subscription.statusActive')
                      : isTrialing 
                        ? t('subscription.statusTrial')
                        : t('subscription.statusExpired')
                    }
                  </Badge>
                  {isTrialing && trialDays !== null && (
                    <Badge variant="outline">
                      {t('subscription.daysRemaining', { count: trialDays })}
                    </Badge>
                  )}
                  {isActive && subscription?.plan && (
                    <Badge variant="outline">
                      {subscription.plan === 'annual' 
                        ? t('subscription.annualPlan') 
                        : subscription.plan === 'daily' 
                          ? 'Plano Diário' 
                          : t('subscription.monthlyPlan')
                      }
                    </Badge>
                  )}
                </div>
                {isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleManageSubscription}
                    disabled={isPortalLoading}
                  >
                    {isPortalLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    {t('subscription.manageSubscription')}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
