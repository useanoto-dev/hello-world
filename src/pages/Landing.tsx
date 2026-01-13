// Landing Page - Anotô Cardápio Digital - Apple Style Clean Design
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  QrCode, BarChart3, Star, Check, Menu, X,
  ArrowRight, Smartphone, Zap, Shield, Search, Store, MapPin, Download, Trophy, User,
  MessageSquare, Send, Printer, Chrome, ShoppingCart, ChefHat, Package, 
  Users, Ticket, Heart, ClipboardList, Bell, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateStoreSlug } from "@/lib/utils";
import SignupModal from "@/components/SignupModal";
import LoginModal from "@/components/LoginModal";

// URLs externas das imagens
const anotoLogoFull = "https://felipedublin.com/wp-content/uploads/2026/01/anoto-logo-full.webp";
import anotoMascotMoto from "@/assets/anoto-mascot-moto.png";

// Cores fixas da landing
const COLORS = {
  background: "#FAFAFA",
  backgroundAlt: "#FFFFFF",
  foreground: "#1D1D1F",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  primaryLight: "#FFF8E1",
  muted: "#86868B",
  border: "rgba(0, 0, 0, 0.04)",
  card: "#FFFFFF",
  success: "#34C759",
};

// iOS-style Glass
const GLASS = {
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  },
  header: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
  },
};

// Integrações
const integrations = [
  { icon: MessageSquare, title: "WhatsApp Bot", desc: "Atendimento 24h", gradient: "from-green-400 to-green-600" },
  { icon: Send, title: "Disparo em Massa", desc: "Promoções", gradient: "from-emerald-400 to-teal-500" },
  { icon: Bell, title: "Notificações", desc: "Status em tempo real", gradient: "from-blue-400 to-blue-600" },
  { icon: Printer, title: "Impressão", desc: "Comandas automáticas", gradient: "from-orange-400 to-red-500" },
  { icon: Chrome, title: "Login Google", desc: "Acesso rápido", gradient: "from-indigo-400 to-purple-500" }
];

// Funcionalidades
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

// Depoimentos
const testimonials = [
  { name: "João Silva", business: "Pizzaria do João", text: "Meu delivery triplicou. Simples de usar!", rating: 5, avatar: "👨‍🍳" },
  { name: "Maria Santos", business: "Café da Maria", text: "Finalmente sem comissão absurda.", rating: 5, avatar: "👩‍🍳" },
  { name: "Carlos Oliveira", business: "Hamburgueria CO", text: "Em 5 minutos estava funcionando!", rating: 5, avatar: "🧑‍🍳" }
];

// Card com animação individual no scroll
const AnimatedCard = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Section Title com animação
const SectionTitle = ({ badge, title, subtitle }: { badge?: string; title: string; subtitle?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-12"
    >
      {badge && (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wide"
          style={{ backgroundColor: `${COLORS.primary}20`, color: COLORS.primaryDark }}>
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: COLORS.foreground }}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: COLORS.muted }}>{subtitle}</p>
      )}
    </motion.div>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuAnimating, setMenuAnimating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [topRatedStores, setTopRatedStores] = useState<any[]>([]);
  
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", session.user.id).maybeSingle();
        navigate(profile?.store_id ? "/dashboard" : "/dashboard/onboarding", { replace: true });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setTimeout(async () => {
          const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", session.user.id).maybeSingle();
          navigate(profile?.store_id ? "/dashboard" : "/dashboard/onboarding", { replace: true });
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // Search
  const searchStores = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase.from("stores").select("id, name, logo_url, address, slug").eq("is_active", true).ilike("name", `%${query}%`).limit(6);
      setSearchResults(data || []);
      setShowResults(true);
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchStores(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchStores]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-search]')) setShowResults(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Top stores
  useEffect(() => {
    const fetch = async () => {
      try {
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: reviews } = await supabase.from("reviews").select("store_id, rating").gte("created_at", start);
        if (!reviews?.length) return;
        
        const map: Record<string, { t: number; c: number }> = {};
        reviews.forEach(r => { map[r.store_id] = map[r.store_id] || { t: 0, c: 0 }; map[r.store_id].t += r.rating; map[r.store_id].c++; });
        
        const sorted = Object.entries(map).map(([id, d]) => ({ id, avg: d.t / d.c, count: d.c })).sort((a, b) => b.avg - a.avg || b.count - a.count).slice(0, 3);
        if (!sorted.length) return;
        
        const { data: stores } = await supabase.from("stores").select("id, name, logo_url, address, slug").in("id", sorted.map(s => s.id)).eq("is_active", true);
        if (!stores?.length) return;
        
        setTopRatedStores(sorted.map(s => { const st = stores.find(x => x.id === s.id); return st ? { ...st, avg_rating: Math.round(s.avg * 10) / 10, review_count: s.count } : null; }).filter(Boolean));
      } catch {}
    };
    fetch();
  }, []);

  // Auth
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !email || !password) { toast.error("Preencha todos os campos"); return; }
    if (!acceptTerms) { toast.error("Aceite os Termos"); return; }
    setLoading(true);
    try {
      const { data: auth, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: storeName } } });
      if (error) throw error;
      if (!auth.user || auth.user.identities?.length === 0) { toast.error("Email já cadastrado"); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 500));
      const { data: store } = await supabase.from("stores").insert({ name: storeName, slug: generateStoreSlug(storeName), primary_color: "#FFC107" }).select().single();
      if (!store) throw new Error("Erro ao criar loja");
      await supabase.from("stores").update({ slug: generateStoreSlug(storeName, store.id) }).eq("id", store.id);
      await supabase.from("profiles").update({ store_id: store.id, is_owner: true }).eq("id", auth.user.id);
      await supabase.from("subscriptions").insert({ store_id: store.id, status: "trial" });
      toast.success("Conta criada!");
      setAuthOpen(false);
      navigate("/dashboard/onboarding");
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado!");
      setAuthOpen(false);
      navigate("/dashboard");
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background, color: COLORS.foreground }}>
      {/* Header - NAO MEXI */}
      <header 
        className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-[95%] max-w-5xl"
        style={{ 
          ...GLASS.header,
          borderRadius: (mobileMenuOpen || menuAnimating) ? "24px" : "9999px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
          transition: "border-radius 0.18s ease-out",
        }}
      >
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between">
          <img src={anotoLogoFull} alt="Anotô?" className="h-10 sm:h-12 object-contain" />
          
          <nav className="hidden md:flex items-center gap-6">
            {["Recursos", "Funcionalidades", "Preços", "Depoimentos"].map((item) => (
              <button key={item} onClick={() => scrollToSection(item.toLowerCase())} 
                className="text-xs font-medium transition-colors hover:text-amber-500"
                style={{ color: COLORS.muted, background: "none", border: "none", cursor: "pointer" }}>
                {item}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => navigate("/explorar")} className="p-2 rounded-full hover:bg-amber-50"
              style={{ color: COLORS.foreground, background: "none", border: "none" }} title="Explorar">
              <Store className="w-4 h-4" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => setShowLoginModal(true)} className="text-xs">Entrar</Button>
            <Button size="sm" onClick={() => setShowSignupModal(true)} className="text-xs font-semibold rounded-full px-4"
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}>
              Começar grátis
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => navigate("/explorar")} className="p-2" style={{ color: COLORS.foreground, background: "none", border: "none" }}>
              <Store className="w-5 h-5" />
            </button>
            <button onClick={() => setShowLoginModal(true)} style={{ color: COLORS.foreground, background: "none", border: "none" }}>
              <User className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: COLORS.foreground, background: "none", border: "none" }}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            onAnimationStart={() => setMenuAnimating(true)} onAnimationComplete={() => setMenuAnimating(false)}
            className="md:hidden" style={{ backgroundColor: "#fff" }}>
            <div className="px-4 py-3 space-y-1">
              {["Recursos", "Funcionalidades", "Preços", "Depoimentos"].map((item) => (
                <button key={item} onClick={() => scrollToSection(item.toLowerCase())}
                  className="block w-full text-left py-2.5 px-3 rounded-xl text-sm hover:bg-amber-50"
                  style={{ color: COLORS.foreground, background: "none", border: "none" }}>
                  {item}
                </button>
              ))}
              <Button className="w-full mt-3 rounded-full text-sm" onClick={() => { setMobileMenuOpen(false); setShowSignupModal(true); }}
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}>
                Começar grátis
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero - Apple Style Minimal */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Text */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-center lg:text-left order-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
                style={{ backgroundColor: `${COLORS.primary}15` }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.primaryDark }} />
                <span className="text-xs font-medium" style={{ color: COLORS.primaryDark }}>#1 em Cardápios Digitais</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-center lg:text-left">
                Seu delivery{" "}
                <span style={{ background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  sem comissão
                </span>
                <br />em 3 minutos
              </h1>
              
              <p className="mt-4 text-sm sm:text-base max-w-md mx-auto lg:mx-0 leading-relaxed" style={{ color: COLORS.muted }}>
                Crie seu cardápio digital, receba pedidos via WhatsApp e gerencie tudo em um lugar. <strong className="font-medium" style={{ color: COLORS.foreground }}>Zero taxas.</strong>
              </p>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button size="lg" onClick={() => setShowSignupModal(true)}
                  className="text-sm px-6 py-5 rounded-full shadow-lg"
                  style={{ backgroundColor: COLORS.primary, color: COLORS.foreground, fontWeight: 600, boxShadow: "0 8px 30px rgba(255, 193, 7, 0.35)" }}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Começar grátis
                </Button>
              </div>
              
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                {[{ icon: Check, text: "7 dias grátis" }, { icon: Shield, text: "Sem cartão" }, { icon: Zap, text: "Setup 3 min" }].map((item) => (
                  <span key={item.text} className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: COLORS.success }} />
                    {item.text}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Mascot */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="relative flex justify-center items-center order-2">
              <div className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full"
                style={{ background: `radial-gradient(circle, ${COLORS.primary}25 0%, transparent 70%)`, filter: "blur(40px)" }} />
              <motion.img src={anotoMascotMoto} alt="Mascote" className="w-48 sm:w-64 lg:w-72 object-contain relative z-10"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
                className="absolute -top-2 right-2 lg:right-6 z-20 px-4 py-2 rounded-xl shadow-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
                <span className="font-semibold text-sm" style={{ color: COLORS.foreground }}>Pediu, Chegou! 🛵</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="px-4 py-6">
        <div className="max-w-xl mx-auto" data-search>
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-sm border"
              style={{ backgroundColor: "#fff", borderColor: COLORS.border }}>
              <Search className="w-4 h-4" style={{ color: COLORS.muted }} />
              <input type="text" placeholder="Buscar estabelecimento..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                className="flex-1 text-sm outline-none bg-transparent" style={{ color: COLORS.foreground }} />
              {isSearching && <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.primary, borderTopColor: "transparent" }} />}
            </div>
            {showResults && searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.border}` }}>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {searchResults.map((store) => (
                    <button key={store.id} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-left"
                      onClick={() => navigate(`/cardapio/${store.slug}`)}>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ background: store.logo_url ? "transparent" : COLORS.primary }}>
                        {store.logo_url ? <img src={store.logo_url} alt="" className="w-full h-full object-cover" /> :
                          <span className="text-xs font-bold">{store.name.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{store.name}</p>
                        <p className="text-xs truncate" style={{ color: COLORS.muted }}>{store.address || "Cardápio Digital"}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: COLORS.muted }} />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Integrações */}
      <section id="recursos" className="px-4 py-16 sm:py-20" style={{ background: `linear-gradient(180deg, ${COLORS.backgroundAlt} 0%, ${COLORS.primaryLight} 50%, ${COLORS.backgroundAlt} 100%)` }}>
        <div className="max-w-5xl mx-auto">
          <SectionTitle badge="INTEGRAÇÕES" title="Tudo conectado" subtitle="Automatize seu atendimento" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {integrations.map((item, i) => (
              <AnimatedCard key={item.title} delay={i * 0.08}>
                <div className="rounded-2xl p-4 h-full text-center transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center bg-gradient-to-br ${item.gradient}`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="mt-3 text-xs font-semibold" style={{ color: COLORS.foreground }}>{item.title}</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: COLORS.muted }}>{item.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="px-4 py-16 sm:py-20" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-5xl mx-auto">
          <SectionTitle badge="FUNCIONALIDADES" title="Gestão completa" subtitle="Tudo que você precisa em um só lugar" />
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {systemFeatures.map((item, i) => (
              <AnimatedCard key={item.title} delay={i * 0.05}>
                <div className="rounded-xl p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ backgroundColor: COLORS.background }}>
                  <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
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

      {/* Top Rated */}
      {topRatedStores.length > 0 && (
        <section className="px-4 py-14 sm:py-16" style={{ backgroundColor: COLORS.background }}>
          <div className="max-w-3xl mx-auto">
            <SectionTitle badge="DESTAQUES DO MÊS" title="Melhores avaliados" />
            <div className="grid sm:grid-cols-3 gap-3">
              {topRatedStores.map((store, i) => (
                <AnimatedCard key={store.id} delay={i * 0.1}>
                  <div className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{ backgroundColor: "#fff", border: i === 0 ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}` }}
                    onClick={() => navigate(`/cardapio/${store.slug}`)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ backgroundColor: i === 0 ? COLORS.primary : i === 1 ? "#E5E7EB" : "#FED7AA", color: i === 0 ? COLORS.foreground : COLORS.muted }}>
                        {i + 1}º
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: `1px solid ${COLORS.border}` }}>
                        {store.logo_url ? <img src={store.logo_url} alt="" className="w-full h-full object-cover" /> :
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
                            <span className="text-xs font-bold">{store.name.charAt(0)}</span>
                          </div>}
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

      {/* Preços */}
      <section id="preços" className="px-4 py-16 sm:py-20" style={{ backgroundColor: COLORS.primaryLight }}>
        <div className="max-w-3xl mx-auto">
          <SectionTitle badge="PREÇO JUSTO" title="Simples, sem surpresas" subtitle="Sem taxa por pedido. Preço fixo." />
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatedCard>
              <div className="rounded-2xl p-6 h-full" style={{ backgroundColor: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
                <h3 className="text-sm font-medium" style={{ color: COLORS.muted }}>Mensal</h3>
                <div className="mt-2">
                  <span className="text-4xl font-semibold">R$ 49</span>
                  <span className="text-sm" style={{ color: COLORS.muted }}>/mês</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {["Cardápio ilimitado", "Pedidos ilimitados", "Zero taxa", "Suporte WhatsApp", "Dashboard", "QR Code"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.success }} />
                      <span className="text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="lg" className="w-full mt-5 rounded-full text-sm" onClick={() => setShowSignupModal(true)}>
                  Começar 7 dias grátis
                </Button>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="rounded-2xl p-6 relative h-full" style={{ backgroundColor: COLORS.primary, boxShadow: "0 8px 30px rgba(255, 193, 7, 0.35)" }}>
                <div className="absolute -top-2.5 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: COLORS.foreground, color: "#fff" }}>
                  ECONOMIZE 20%
                </div>
                <h3 className="text-sm font-medium" style={{ color: COLORS.foreground }}>Anual</h3>
                <div className="mt-2">
                  <span className="text-4xl font-semibold" style={{ color: COLORS.foreground }}>R$ 39</span>
                  <span className="text-sm" style={{ color: COLORS.foreground, opacity: 0.7 }}>/mês</span>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: COLORS.foreground, opacity: 0.7 }}>Cobrado anualmente (R$ 468)</p>
                <ul className="mt-5 space-y-2.5">
                  {["Tudo do mensal", "Suporte prioritário", "Consultoria inicial", "Cardápio premium", "Relatórios avançados", "WhatsApp API"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.foreground }} />
                      <span className="text-xs" style={{ color: COLORS.foreground }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="w-full mt-5 rounded-full text-sm" onClick={() => setShowSignupModal(true)}
                  style={{ backgroundColor: COLORS.foreground, color: "#fff" }}>
                  Começar 7 dias grátis
                </Button>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="px-4 py-16 sm:py-20" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-4xl mx-auto">
          <SectionTitle badge="DEPOIMENTOS" title="O que dizem nossos clientes" />
          <div className="grid sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <AnimatedCard key={t.name} delay={i * 0.1}>
                <div className="rounded-2xl p-5 h-full" style={{ backgroundColor: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                    ))}
                  </div>
                  <p className="text-sm italic mb-4" style={{ color: COLORS.foreground }}>"{t.text}"</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: COLORS.primaryLight }}>
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

      {/* Final CTA */}
      <section className="px-4 py-16 sm:py-20">
        <AnimatedCard>
          <div className="max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 text-center"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`, boxShadow: "0 16px 48px rgba(255, 193, 7, 0.3)" }}>
            <h2 className="text-2xl sm:text-3xl font-semibold" style={{ color: COLORS.foreground }}>Pronto para vender mais?</h2>
            <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: COLORS.foreground, opacity: 0.8 }}>
              Teste gratuito de 7 dias. Sem compromisso, sem cartão.
            </p>
            <Button size="lg" onClick={() => setShowSignupModal(true)}
              className="mt-6 text-sm px-8 py-5 rounded-full shadow-lg"
              style={{ backgroundColor: COLORS.foreground, color: "#fff", fontWeight: 600 }}>
              Criar meu cardápio grátis
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </AnimatedCard>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={anotoMascotMoto} alt="" className="w-8 h-8 object-contain" />
              <div>
                <span className="font-semibold text-sm">Anotô</span>
                <p className="text-[10px]" style={{ color: COLORS.muted }}>Pediu, chegou!</p>
              </div>
            </div>
            <div className="flex items-center gap-5 flex-wrap justify-center">
              {[{ label: "FAQ", path: "/faq" }, { label: "Privacidade", path: "/privacidade" }, { label: "Termos", path: "/termos" }].map(link => (
                <button key={link.label} onClick={() => navigate(link.path)}
                  className="text-xs hover:text-amber-500 transition-colors"
                  style={{ color: COLORS.muted, background: "none", border: "none", cursor: "pointer" }}>
                  {link.label}
                </button>
              ))}
              <button onClick={() => navigate("/instalar")}
                className="flex items-center gap-1.5 text-xs hover:text-amber-500 transition-colors"
                style={{ color: COLORS.muted, background: "none", border: "none", cursor: "pointer" }}>
                <Download className="w-3.5 h-3.5" />
                Instalar App
              </button>
            </div>
          </div>
          <div className="mt-5 pt-5 text-center" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <p className="text-xs" style={{ color: COLORS.muted }}>© {new Date().getFullYear()} Anotô. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="mx-4 max-w-sm rounded-2xl" style={{ backgroundColor: "#fff" }}>
          <DialogHeader>
            <DialogTitle className="text-center text-base">{isLogin ? "Entrar" : "Criar conta grátis"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-3 mt-3">
            {!isLogin && (
              <div>
                <Label htmlFor="storeName" className="text-xs">Nome do estabelecimento</Label>
                <Input id="storeName" placeholder="Ex: Pizzaria do João" value={storeName}
                  onChange={(e) => setStoreName(e.target.value)} className="mt-1 rounded-xl text-sm" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-xl text-sm" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} className="mt-1 rounded-xl text-sm" />
            </div>
            {!isLogin && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-500" disabled={loading} />
                <span className="text-[10px]" style={{ color: COLORS.muted }}>
                  Li e aceito os <button type="button" onClick={() => navigate("/termos")} className="text-amber-600 hover:underline font-medium" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>Termos</button> e a <button type="button" onClick={() => navigate("/privacidade")} className="text-amber-600 hover:underline font-medium" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>Política de Privacidade</button>
                </span>
              </label>
            )}
            <Button type="submit" className="w-full rounded-full text-sm" disabled={loading || (!isLogin && !acceptTerms)}
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground, fontWeight: 600 }}>
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta grátis"}
            </Button>
          </form>
          <div className="text-center mt-3">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-xs"
              style={{ color: COLORS.muted, background: "none", border: "none", cursor: "pointer" }}>
              {isLogin ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <SignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => { setShowSignupModal(false); setShowLoginModal(true); }} />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true); }} />
    </div>
  );
}
