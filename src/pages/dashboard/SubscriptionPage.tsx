import { motion } from "framer-motion";
import { Check, Shield, Zap, Crown, Star, ArrowLeft, Loader2, Settings, ExternalLink, CreditCard, QrCode, Copy, RefreshCw, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [isRegeneratingPix, setIsRegeneratingPix] = useState(false);
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
  
  const [pixData, setPixData] = useState<{
    qrCode: string;
    code: string;
    expiresAt: string;
    amount: number;
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
      // If there's pending PIX data, set it
      if (data.pix_qr_code_url && data.pix_code && data.pix_expires_at) {
        setPixData({
          qrCode: data.pix_qr_code_url,
          code: data.pix_code,
          expiresAt: data.pix_expires_at,
          amount: data.plan === 'annual' ? 1716 : 179.90,
        });
        setPaymentMethod('pix');
      }
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [restaurantId]);

  // Check if PIX is expired
  const isPixExpired = () => {
    if (!pixData?.expiresAt) return false;
    return new Date(pixData.expiresAt) < new Date();
  };

  // Check if subscription is near expiry (show renewal option)
  const isNearExpiry = () => {
    if (!subscription?.current_period_end) return false;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > -3; // Show 7 days before until 3 days after
  };

  // Check if blocked (past 3 days tolerance)
  const isBlocked = () => {
    if (!subscription?.current_period_end) return false;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    const daysPastExpiry = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysPastExpiry > 0 && subscription.status === 'expired';
  };

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
        // PIX flow - generate QR code
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
          toast.success('QR Code PIX gerado! Escaneie para pagar.');
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

  const handleRegeneratePix = async () => {
    if (!subscription?.plan) return;
    setIsRegeneratingPix(true);
    await handleSubscribe(subscription.plan as "monthly" | "annual");
    setIsRegeneratingPix(false);
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

        {/* Payment Method Selection & PIX QR Code */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 max-w-md mx-auto space-y-4"
          >
            {/* Payment Method Radio */}
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-3">Forma de Pagamento</h4>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value as "card" | "pix");
                  setPixData(null);
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Cartão de Crédito ou Boleto</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">PIX (Créditos)</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">30 dias</Badge>
                  </Label>
                </div>
              </RadioGroup>
            </Card>

            {/* PIX QR Code Display */}
            {pixData && paymentMethod === 'pix' && (
              <Card className="p-5">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Smartphone className="w-4 h-4" />
                    <span>Escaneie o QR Code para pagar</span>
                  </div>

                  {isPixExpired() ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm font-medium">QR Code expirado</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegeneratePix}
                        disabled={isRegeneratingPix}
                      >
                        {isRegeneratingPix ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Gerar novo QR Code
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <img 
                          src={pixData.qrCode} 
                          alt="PIX QR Code" 
                          className="w-48 h-48 rounded-lg border"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-2xl font-bold" style={{ color: COLORS.foreground }}>
                          R$ {pixData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expira em {formatDistanceToNow(new Date(pixData.expiresAt), { 
                            locale: ptBR, 
                            addSuffix: true 
                          })}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Ou copie o código:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={pixData.code}
                            readOnly
                            className="flex-1 text-xs p-2 border rounded-lg bg-muted/50 font-mono truncate"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyPixCode}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRegeneratePix}
                          disabled={isRegeneratingPix}
                          className="text-xs text-muted-foreground"
                        >
                          {isRegeneratingPix ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Gerar novo código
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-[11px] text-muted-foreground">
                      ✅ Após o pagamento, seu acesso será liberado automaticamente por{' '}
                      <strong>{subscription?.plan === 'annual' ? '1 ano + 3 dias' : '30 dias + 3 dias'}</strong> de tolerância.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* Renewal Alert for Active Users Near Expiry */}
        {isActive && isNearExpiry() && subscription?.payment_method === 'pix' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 max-w-md mx-auto"
          >
            <Card className="p-4 border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800">
                    Sua assinatura expira em breve!
                  </p>
                  <p className="text-xs text-amber-700">
                    Renove agora para evitar interrupção no serviço. Após 3 dias de atraso, o acesso será bloqueado.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setPaymentMethod('pix');
                      handleSubscribe(subscription?.plan as "monthly" | "annual");
                    }}
                    disabled={isLoading !== null}
                    style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <QrCode className="w-3 h-3 mr-2" />
                    )}
                    Renovar com PIX
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Blocked Alert */}
        {isBlocked() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 max-w-md mx-auto"
          >
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-800">
                    Acesso bloqueado por falta de pagamento
                  </p>
                  <p className="text-xs text-red-700">
                    Seu período de tolerância expirou. Realize o pagamento abaixo para reativar o acesso.
                  </p>
                </div>
              </div>
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
