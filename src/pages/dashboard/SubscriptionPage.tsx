import { motion } from "framer-motion";
import { Check, Shield, Zap, Crown, Star, ArrowLeft, Loader2, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

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
  const [subscription, setSubscription] = useState<{
    status: string;
    plan?: string;
    trial_ends_at?: string;
    current_period_end?: string;
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
      .select('status, plan, trial_ends_at, current_period_end')
      .eq('store_id', restaurantId)
      .single();
    
    if (data) {
      setSubscription(data);
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
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(t('subscription.error'));
    } finally {
      setIsLoading(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Anual - Destaque */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="order-1 md:order-2"
          >
            <Card 
              className="relative h-full overflow-hidden border-0"
              style={{ backgroundColor: COLORS.foreground, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}
            >
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-b-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              >
                <Star className="w-3 h-3" />
                {t('subscription.mostChosen')}
              </div>
              
              <div className="p-6 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-base font-semibold text-white">{t('subscription.annualPlan')}</h3>
                  </div>
                  <span 
                    className="text-xs px-3 py-1 rounded-full font-semibold w-fit"
                    style={{ backgroundColor: COLORS.success, color: "#fff" }}
                  >
                    {t('subscription.saveYear', { amount: '442,80' })}
                  </span>
                </div>
                
                <div className="flex items-baseline flex-wrap gap-x-1">
                  <span className="text-sm line-through" style={{ color: "rgba(255,255,255,0.5)" }}>
                    R$ 179,90
                  </span>
                  <span className="text-5xl font-bold text-white">R$ 143</span>
                  <span className="text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>,00</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>/{t('subscription.month')}</span>
                </div>
                
                <div 
                  className="mt-3 p-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <p className="text-xs text-white flex flex-wrap items-center gap-1">
                    <span className="font-semibold">{t('subscription.yearlyTotal')}:</span> 
                    <span>R$ 1.716,00</span>
                    <span className="text-[10px]" style={{ color: COLORS.primary }}>• 12x R$ 143,00</span>
                  </p>
                </div>
                
                <div className="my-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
                
                <ul className="space-y-3">
                  {annualFeatures.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        <Check className="w-3 h-3" style={{ color: COLORS.foreground }} />
                      </div>
                      <span className="text-sm text-white">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  size="lg" 
                  className="w-full mt-6 rounded-full text-sm font-semibold h-12 transition-transform hover:scale-[1.02]"
                  onClick={() => handleSubscribe("annual")}
                  disabled={isLoading !== null || isActive}
                  style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                >
                  {isLoading === "annual" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {isActive ? t('subscription.currentPlan') : t('subscription.subscribeAnnual')}
                </Button>
                
                <p className="text-center mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  🔒 {t('subscription.guarantee')}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Plano Mensal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-2 md:order-1"
          >
            <Card 
              className="h-full relative overflow-hidden"
              style={{ backgroundColor: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: `1px solid ${COLORS.border}` }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: COLORS.foreground }}>
                    {t('subscription.monthlyPlan')}
                  </h3>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: COLORS.backgroundAlt, color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
                  >
                    {t('subscription.flexible')}
                  </span>
                </div>
                
                <div className="flex items-baseline flex-wrap gap-x-1">
                  <span className="text-5xl font-bold" style={{ color: COLORS.foreground }}>R$ 179</span>
                  <span className="text-lg" style={{ color: COLORS.muted }}>,90</span>
                  <span className="text-sm" style={{ color: COLORS.muted }}>/{t('subscription.month')}</span>
                </div>
                
                <p className="mt-2 text-xs" style={{ color: COLORS.muted }}>
                  {t('subscription.monthlyBilling')}
                </p>
                
                <div className="my-5 h-px" style={{ backgroundColor: COLORS.border }} />
                
                <ul className="space-y-3">
                  {monthlyFeatures.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: COLORS.primaryLight }}
                      >
                        <Check className="w-3 h-3" style={{ color: COLORS.primaryDark }} />
                      </div>
                      <span className="text-sm" style={{ color: COLORS.foreground }}>{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full mt-6 rounded-full text-sm font-semibold h-12"
                  onClick={() => handleSubscribe("monthly")}
                  disabled={isLoading !== null || isActive}
                  style={{ borderColor: COLORS.border, color: COLORS.foreground }}
                >
                  {isLoading === "monthly" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {isActive ? t('subscription.currentPlan') : t('subscription.subscribeMonthly')}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

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
                        plan: subscription?.plan === 'annual' ? t('subscription.annualPlan') : t('subscription.monthlyPlan'),
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
                      {subscription.plan === 'annual' ? t('subscription.annualPlan') : t('subscription.monthlyPlan')}
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
