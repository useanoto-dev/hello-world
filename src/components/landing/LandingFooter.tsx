// Landing page footer component
import { useNavigate } from "react-router-dom";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "./LandingAnimations";
import anotoMascotFooter from "@/assets/anoto-mascot-footer.avif";

const COLORS = {
  foreground: "#1D1D1F",
  muted: "#86868B",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  background: "#FDFDFD",
};

interface LandingFooterProps {
  onOpenSignup: () => void;
}

export function LandingFooter({ onOpenSignup }: LandingFooterProps) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Final CTA */}
      <section className="px-4 py-16 sm:py-20">
        <AnimatedCard>
          <div 
            className="max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`, 
              boxShadow: "0 16px 48px rgba(255, 193, 7, 0.3)" 
            }}
          >
            <h2 className="text-2xl sm:text-3xl font-semibold" style={{ color: COLORS.foreground }}>
              Pronto para vender mais?
            </h2>
            <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: COLORS.foreground, opacity: 0.8 }}>
              Teste gratuito de 7 dias. Sem compromisso, sem cartão.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                onClick={onOpenSignup}
                className="text-sm px-8 rounded-full h-12 shadow-lg"
                style={{ backgroundColor: COLORS.foreground, color: "#fff" }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Criar cardápio grátis
              </Button>
            </div>
          </div>
        </AnimatedCard>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12" style={{ backgroundColor: COLORS.background }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={anotoMascotFooter} alt="Anotô" className="w-12 h-12 object-contain" />
              <div>
                <h3 className="font-semibold text-sm" style={{ color: COLORS.foreground }}>Anotô?</h3>
                <p className="text-xs" style={{ color: COLORS.muted }}>Cardápio digital sem comissão</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {[
                { label: "Política de Privacidade", path: "/politica-de-privacidade" },
                { label: "Termos de Uso", path: "/termos-de-uso" },
                { label: "FAQ", path: "/faq" },
              ].map((item) => (
                <button 
                  key={item.label}
                  onClick={() => navigate(item.path)} 
                  className="text-xs hover:underline"
                  style={{ color: COLORS.muted, background: "none", border: "none", cursor: "pointer" }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/instalar")} 
              className="rounded-full text-xs gap-1.5"
              style={{ borderColor: COLORS.primary }}
            >
              <Download className="w-3.5 h-3.5" />
              Instalar App
            </Button>
          </div>
          
          <div className="mt-8 pt-6 text-center text-xs" style={{ borderTop: `1px solid ${COLORS.muted}20`, color: COLORS.muted }}>
            © {currentYear} Anotô. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </>
  );
}
