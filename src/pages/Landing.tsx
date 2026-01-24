// Landing Page - Anotô Cardápio Digital - Apple Style Clean Design (Refactored)
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateStoreSlug } from "@/lib/utils";
import SignupModal from "@/components/SignupModal";
import LoginModal from "@/components/LoginModal";
import {
  LandingHeader,
  LandingHero,
  LandingIntegrations,
  LandingFeatures,
  LandingPricing,
  LandingTestimonials,
  LandingFooter,
  AnimatedCard,
  SectionTitle,
} from "@/components/landing";

const COLORS = {
  background: "#FDFDFD",
  foreground: "#1D1D1F",
  primary: "#FFC107",
  muted: "#86868B",
  border: "rgba(0, 0, 0, 0.04)",
};

export default function Landing() {
  const navigate = useNavigate();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [topRatedStores, setTopRatedStores] = useState<any[]>([]);

  // Auth check - redirect if logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("store_id")
          .eq("id", session.user.id)
          .maybeSingle();
        navigate(profile?.store_id ? "/dashboard" : "/dashboard/onboarding", { replace: true });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("store_id")
            .eq("id", session.user.id)
            .maybeSingle();
          navigate(profile?.store_id ? "/dashboard" : "/dashboard/onboarding", { replace: true });
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch top rated stores
  useEffect(() => {
    const fetchTopStores = async () => {
      try {
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: reviews } = await supabase
          .from("reviews")
          .select("store_id, rating")
          .gte("created_at", start);
        
        if (!reviews?.length) return;
        
        const map: Record<string, { t: number; c: number }> = {};
        reviews.forEach(r => { 
          map[r.store_id] = map[r.store_id] || { t: 0, c: 0 }; 
          map[r.store_id].t += r.rating; 
          map[r.store_id].c++; 
        });
        
        const sorted = Object.entries(map)
          .map(([id, d]) => ({ id, avg: d.t / d.c, count: d.c }))
          .sort((a, b) => b.avg - a.avg || b.count - a.count)
          .slice(0, 3);
        
        if (!sorted.length) return;
        
        const { data: stores } = await supabase
          .from("stores")
          .select("id, name, logo_url, address, slug")
          .in("id", sorted.map(s => s.id))
          .eq("is_active", true);
        
        if (!stores?.length) return;
        
        setTopRatedStores(sorted.map(s => { 
          const st = stores.find(x => x.id === s.id); 
          return st ? { ...st, avg_rating: Math.round(s.avg * 10) / 10, review_count: s.count } : null; 
        }).filter(Boolean));
      } catch {}
    };
    fetchTopStores();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background, color: COLORS.foreground }}>
      <LandingHeader 
        onOpenSignup={() => setShowSignupModal(true)} 
        onOpenLogin={() => setShowLoginModal(true)} 
      />

      <LandingHero onOpenSignup={() => setShowSignupModal(true)} />

      <LandingIntegrations />

      <LandingFeatures />

      {/* Top Rated Stores */}
      {topRatedStores.length > 0 && (
        <section className="px-4 py-14 sm:py-16" style={{ backgroundColor: COLORS.background }}>
          <div className="max-w-3xl mx-auto">
            <SectionTitle badge="DESTAQUES DO MÊS" title="Melhores avaliados" />
            <div className="grid sm:grid-cols-3 gap-3">
              {topRatedStores.map((store, i) => (
                <AnimatedCard key={store.id} delay={i * 0.1}>
                  <div 
                    className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{ 
                      backgroundColor: "#fff", 
                      border: i === 0 ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}` 
                    }}
                    onClick={() => navigate(`/cardapio/${store.slug}`)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ 
                          backgroundColor: i === 0 ? COLORS.primary : i === 1 ? "#E5E7EB" : "#FED7AA", 
                          color: i === 0 ? COLORS.foreground : COLORS.muted 
                        }}
                      >
                        {i + 1}º
                      </div>
                      <div 
                        className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" 
                        style={{ border: `1px solid ${COLORS.border}` }}
                      >
                        {store.logo_url ? (
                          <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center" 
                            style={{ backgroundColor: "#FFF8E1" }}
                          >
                            <span className="text-xs font-bold">{store.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs truncate">{store.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                          <span className="text-[10px] font-medium">{store.avg_rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>
      )}

      <LandingPricing onOpenSignup={() => setShowSignupModal(true)} />

      <LandingTestimonials />

      <LandingFooter onOpenSignup={() => setShowSignupModal(true)} />

      {/* Auth Modals */}
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)} 
        onSwitchToLogin={() => { setShowSignupModal(false); setShowLoginModal(true); }}
      />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true); }}
      />
    </div>
  );
}
