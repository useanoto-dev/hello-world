// Landing page pricing section
import { Check, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCard, SectionTitle } from "./LandingAnimations";

const COLORS = {
  foreground: "#1D1D1F",
  muted: "#86868B",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  primaryLight: "#FFF8E1",
  backgroundAlt: "#FFFFFF",
  border: "rgba(0, 0, 0, 0.04)",
  success: "#34C759",
};

interface LandingPricingProps {
  onOpenSignup: () => void;
}

export function LandingPricing({ onOpenSignup }: LandingPricingProps) {
  return (
    <section 
      id="preços" 
      className="px-3 sm:px-4 py-12 sm:py-20 relative" 
      style={{ 
        background: `linear-gradient(180deg, transparent 0%, ${COLORS.primaryLight} 8%, ${COLORS.primaryLight} 92%, transparent 100%)` 
      }}
    >
      <div className="max-w-3xl mx-auto">
        <SectionTitle 
          badge="PREÇO JUSTO" 
          title="Invista no crescimento do seu negócio" 
          subtitle="Sem taxa por pedido. Cancele quando quiser." 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Plano Anual - Destaque */}
          <AnimatedCard delay={0} className="order-1 md:order-2">
            <div 
              className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative h-full overflow-hidden" 
              style={{ backgroundColor: COLORS.foreground, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}
            >
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-b-lg sm:rounded-b-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              >
                ⭐ Mais Escolhido
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4 mt-6 sm:mt-4">
                <h3 className="text-sm sm:text-base font-semibold text-white">Plano Anual</h3>
                <span 
                  className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full font-semibold w-fit" 
                  style={{ backgroundColor: COLORS.success, color: "#fff" }}
                >
                  Economize R$ 442,80/ano
                </span>
              </div>
              
              <div className="flex items-baseline flex-wrap gap-x-1">
                <span className="text-xs sm:text-sm line-through" style={{ color: "rgba(255,255,255,0.5)" }}>R$ 179,90</span>
                <span className="text-3xl sm:text-5xl font-bold text-white">R$ 143</span>
                <span className="text-base sm:text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>,00</span>
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>/mês</span>
              </div>
              
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg sm:rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <p className="text-[10px] sm:text-xs text-white flex flex-wrap items-center gap-1">
                  <span className="font-semibold">Total anual:</span> 
                  <span>R$ 1.716,00</span>
                  <span className="text-[9px] sm:text-[10px]" style={{ color: COLORS.primary }}>• 12x R$ 143,00</span>
                </p>
              </div>
              
              <div className="my-3 sm:my-5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
              
              <ul className="space-y-2 sm:space-y-3">
                {["Tudo do plano mensal", "Suporte prioritário 24h", "Consultoria de lançamento", "Cardápio com tema premium", "Relatórios avançados", "WhatsApp API integrada"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0" 
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: COLORS.foreground }} />
                    </div>
                    <span className="text-xs sm:text-sm text-white">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                size="lg" 
                className="w-full mt-4 sm:mt-6 rounded-full text-xs sm:text-sm font-semibold h-10 sm:h-12 transition-transform hover:scale-[1.02]" 
                onClick={onOpenSignup}
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              >
                Começar 7 dias grátis
              </Button>
              
              <p className="text-center mt-2 sm:mt-3 text-[9px] sm:text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                🔒 Garantia de 7 dias ou seu dinheiro de volta
              </p>
            </div>
          </AnimatedCard>

          {/* Plano Mensal */}
          <AnimatedCard delay={0.1} className="order-2 md:order-1">
            <div 
              className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 h-full relative overflow-hidden" 
              style={{ backgroundColor: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold" style={{ color: COLORS.foreground }}>Plano Mensal</h3>
                <span 
                  className="text-[10px] sm:text-xs px-2 py-1 rounded-full" 
                  style={{ backgroundColor: COLORS.backgroundAlt, color: COLORS.muted }}
                >
                  Flexível
                </span>
              </div>
              <div className="flex items-baseline flex-wrap gap-x-1">
                <span className="text-3xl sm:text-5xl font-bold" style={{ color: COLORS.foreground }}>R$ 179</span>
                <span className="text-base sm:text-lg" style={{ color: COLORS.muted }}>,90</span>
                <span className="text-xs sm:text-sm" style={{ color: COLORS.muted }}>/mês</span>
              </div>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs" style={{ color: COLORS.muted }}>Cobrança mensal, sem compromisso</p>
              <div className="my-3 sm:my-5 h-px" style={{ backgroundColor: COLORS.border }} />
              <ul className="space-y-2 sm:space-y-3">
                {["Cardápio digital ilimitado", "Pedidos ilimitados", "Zero taxa por pedido", "Suporte via WhatsApp", "Dashboard completo", "QR Code personalizado"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0" 
                      style={{ backgroundColor: COLORS.primaryLight }}
                    >
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: COLORS.primaryDark }} />
                    </div>
                    <span className="text-xs sm:text-sm" style={{ color: COLORS.foreground }}>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full mt-4 sm:mt-6 rounded-full text-xs sm:text-sm font-semibold h-10 sm:h-12" 
                onClick={onOpenSignup}
                style={{ borderColor: COLORS.border, color: COLORS.foreground }}
              >
                Começar 7 dias grátis
              </Button>
            </div>
          </AnimatedCard>
        </div>
        
        {/* Trust badges */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs" style={{ color: COLORS.muted }}>
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: COLORS.success }} />
            Pagamento seguro
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: COLORS.primary }} />
            Ativação instantânea
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: COLORS.success }} />
            Cancele quando quiser
          </span>
        </div>
      </div>
    </section>
  );
}
