// Landing page features section
import { 
  ShoppingCart, ChefHat, Package, Users, Ticket, 
  Heart, ClipboardList, Star, QrCode 
} from "lucide-react";
import { AnimatedCard, SectionTitle } from "./LandingAnimations";

const COLORS = {
  foreground: "#1D1D1F",
  muted: "#86868B",
  background: "#FDFDFD",
  backgroundAlt: "#FFFFFF",
  primaryDark: "#FFB300",
  primaryLight: "#FFF8E1",
};

const systemFeatures = [
  { icon: ShoppingCart, title: "PDV", desc: "Atendimento presencial" },
  { icon: ChefHat, title: "KDS", desc: "Kanban para cozinha" },
  { icon: Package, title: "Estoque", desc: "Alertas automáticos" },
  { icon: Users, title: "Mesas", desc: "Ocupação e comandas" },
  { icon: Ticket, title: "Cupons", desc: "Descontos" },
  { icon: Heart, title: "Fidelidade", desc: "Programa de pontos" },
  { icon: ClipboardList, title: "CRM", desc: "Histórico de clientes" },
  { icon: Star, title: "Avaliações", desc: "Feedback" },
  { icon: QrCode, title: "QR Code", desc: "Pedidos via celular" }
];

export function LandingFeatures() {
  return (
    <section id="funcionalidades" className="px-4 py-16 sm:py-20" style={{ backgroundColor: COLORS.backgroundAlt }}>
      <div className="max-w-5xl mx-auto">
        <SectionTitle badge="FUNCIONALIDADES" title="Gestão completa" subtitle="Tudo que você precisa em um só lugar" />
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {systemFeatures.map((item, i) => (
            <AnimatedCard key={item.title} delay={i * 0.05}>
              <div 
                className="rounded-xl p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ backgroundColor: COLORS.background }}
              >
                <div 
                  className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center" 
                  style={{ backgroundColor: COLORS.primaryLight }}
                >
                  <item.icon className="w-4 h-4" style={{ color: COLORS.primaryDark }} />
                </div>
                <h3 className="mt-2 text-[10px] font-semibold leading-tight" style={{ color: COLORS.foreground }}>{item.title}</h3>
                <p className="text-[9px] mt-0.5 leading-tight" style={{ color: COLORS.muted }}>{item.desc}</p>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
