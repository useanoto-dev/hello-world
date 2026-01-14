import { motion } from "framer-motion";
import { Check, Shield, Zap, Crown, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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

const monthlyFeatures = [
  "Cardápio digital ilimitado",
  "Pedidos ilimitados",
  "Zero taxa por pedido",
  "Suporte via WhatsApp",
  "Dashboard completo",
  "QR Code personalizado",
];

const annualFeatures = [
  "Tudo do plano mensal",
  "Suporte prioritário 24h",
  "Consultoria de lançamento",
  "Cardápio com tema premium",
  "Relatórios avançados",
  "WhatsApp API integrada",
];

export default function SubscriptionPage() {
  const navigate = useNavigate();

  const handleSubscribe = (plan: "monthly" | "annual") => {
    // Por enquanto apenas mostra que clicou
    console.log(`Selecionou plano: ${plan}`);
  };

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
            <h1 className="text-xl font-semibold">Assinatura</h1>
            <p className="text-sm text-muted-foreground">Escolha o melhor plano para seu negócio</p>
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
            PREÇO JUSTO
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Invista no crescimento do seu negócio
          </h2>
          <p className="text-muted-foreground text-sm">
            Sem taxa por pedido. Cancele quando quiser.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Anual - Destaque (primeiro no mobile) */}
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
              {/* Badge Mais Escolhido */}
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-b-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              >
                <Star className="w-3 h-3" />
                Mais Escolhido
              </div>
              
              <div className="p-6 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-base font-semibold text-white">Plano Anual</h3>
                  </div>
                  <span 
                    className="text-xs px-3 py-1 rounded-full font-semibold w-fit"
                    style={{ backgroundColor: COLORS.success, color: "#fff" }}
                  >
                    Economize R$ 442,80/ano
                  </span>
                </div>
                
                <div className="flex items-baseline flex-wrap gap-x-1">
                  <span className="text-sm line-through" style={{ color: "rgba(255,255,255,0.5)" }}>
                    R$ 179,90
                  </span>
                  <span className="text-5xl font-bold text-white">R$ 143</span>
                  <span className="text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>,00</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>/mês</span>
                </div>
                
                <div 
                  className="mt-3 p-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <p className="text-xs text-white flex flex-wrap items-center gap-1">
                    <span className="font-semibold">Total anual:</span> 
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
                  style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                >
                  Assinar Plano Anual
                </Button>
                
                <p className="text-center mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  🔒 Garantia de 7 dias ou seu dinheiro de volta
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
                    Plano Mensal
                  </h3>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: COLORS.backgroundAlt, color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
                  >
                    Flexível
                  </span>
                </div>
                
                <div className="flex items-baseline flex-wrap gap-x-1">
                  <span className="text-5xl font-bold" style={{ color: COLORS.foreground }}>R$ 179</span>
                  <span className="text-lg" style={{ color: COLORS.muted }}>,90</span>
                  <span className="text-sm" style={{ color: COLORS.muted }}>/mês</span>
                </div>
                
                <p className="mt-2 text-xs" style={{ color: COLORS.muted }}>
                  Cobrança mensal, sem compromisso
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
                  style={{ borderColor: COLORS.border, color: COLORS.foreground }}
                >
                  Assinar Plano Mensal
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
            Pagamento seguro
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" style={{ color: COLORS.primary }} />
            Ativação instantânea
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" style={{ color: COLORS.success }} />
            Cancele quando quiser
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
                <h3 className="font-semibold mb-1">Status da sua assinatura</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Você está utilizando o período de teste gratuito. Assine um plano para continuar usando após o período de teste.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Período de teste</Badge>
                  <Badge variant="outline">7 dias restantes</Badge>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
