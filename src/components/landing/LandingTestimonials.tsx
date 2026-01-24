// Landing page testimonials section
import { Star } from "lucide-react";
import { AnimatedCard, SectionTitle } from "./LandingAnimations";

const COLORS = {
  foreground: "#1D1D1F",
  muted: "#86868B",
  primary: "#FFC107",
  backgroundAlt: "#FFFFFF",
  primaryLight: "#FFF8E1",
};

const testimonials = [
  { name: "João Silva", business: "Pizzaria do João", text: "Meu delivery triplicou. Simples de usar!", rating: 5, avatar: "👨‍🍳" },
  { name: "Maria Santos", business: "Café da Maria", text: "Finalmente sem comissão absurda.", rating: 5, avatar: "👩‍🍳" },
  { name: "Carlos Oliveira", business: "Hamburgueria CO", text: "Em 5 minutos estava funcionando!", rating: 5, avatar: "🧑‍🍳" }
];

export function LandingTestimonials() {
  return (
    <section id="depoimentos" className="px-4 py-16 sm:py-20" style={{ backgroundColor: COLORS.backgroundAlt }}>
      <div className="max-w-4xl mx-auto">
        <SectionTitle badge="DEPOIMENTOS" title="O que dizem nossos clientes" />
        <div className="grid sm:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <AnimatedCard key={t.name} delay={i * 0.1}>
              <div 
                className="rounded-2xl p-5 h-full" 
                style={{ backgroundColor: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                  ))}
                </div>
                <p className="text-sm italic mb-4" style={{ color: COLORS.foreground }}>"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg" 
                    style={{ backgroundColor: COLORS.primaryLight }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-xs">{t.name}</p>
                    <p className="text-[10px]" style={{ color: COLORS.muted }}>{t.business}</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
