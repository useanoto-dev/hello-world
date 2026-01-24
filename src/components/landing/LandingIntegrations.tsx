// Landing page integrations section
import { AnimatedCard, SectionTitle } from "./LandingAnimations";
import integrationWhatsapp from "@/assets/integration-whatsapp.avif";
import integrationBroadcast from "@/assets/integration-broadcast.avif";
import integrationNotification from "@/assets/integration-notification.avif";
import integrationPrint from "@/assets/integration-print.avif";
import integrationGoogle from "@/assets/integration-google.avif";

const COLORS = {
  foreground: "#1D1D1F",
  muted: "#86868B",
  backgroundAlt: "#FFFFFF",
  primaryLight: "#FFF8E1",
};

const integrations = [
  { image: integrationWhatsapp, title: "WhatsApp Bot", desc: "Atendimento 24h" },
  { image: integrationBroadcast, title: "Disparo em Massa", desc: "Promoções" },
  { image: integrationNotification, title: "Notificações", desc: "Status em tempo real" },
  { image: integrationPrint, title: "Impressão", desc: "Comandas automáticas" },
  { image: integrationGoogle, title: "Login Google", desc: "Acesso rápido" }
];

export function LandingIntegrations() {
  return (
    <section 
      id="recursos" 
      className="px-4 py-16 sm:py-20" 
      style={{ 
        background: `linear-gradient(180deg, ${COLORS.backgroundAlt} 0%, ${COLORS.primaryLight} 50%, ${COLORS.backgroundAlt} 100%)` 
      }}
    >
      <div className="max-w-5xl mx-auto">
        <SectionTitle badge="INTEGRAÇÕES" title="Tudo conectado" subtitle="Automatize seu atendimento" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {integrations.map((item, i) => (
            <AnimatedCard key={item.title} delay={i * 0.08}>
              <div 
                className="rounded-2xl p-4 h-full text-center transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center overflow-hidden">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="mt-3 text-xs font-semibold" style={{ color: COLORS.foreground }}>{item.title}</h3>
                <p className="text-[10px] mt-0.5" style={{ color: COLORS.muted }}>{item.desc}</p>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
