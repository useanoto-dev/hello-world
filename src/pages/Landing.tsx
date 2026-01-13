// Landing Page - Anotô - Fast, Modern, Impactful
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  QrCode, BarChart3, Star, Check, Menu, X,
  ArrowRight, Smartphone, Zap, Shield, Search, Store, MapPin, Download, Trophy,
  MessageSquare, Send, Printer, Bell, Sparkles, Play, ChevronRight,
  ShoppingCart, ChefHat, Package, Users, Ticket, Heart, Clock, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SignupModal from "@/components/SignupModal";
import LoginModal from "@/components/LoginModal";

// Lazy load do mascote para carregar mais rápido
import anotoMascotMoto from "@/assets/anoto-mascot-moto.png";
const anotoLogoFull = "https://felipedublin.com/wp-content/uploads/2026/01/anoto-logo-full.webp";

// Design tokens - cores vibrantes e modernas
const COLORS = {
  background: "#FAFAFA",
  backgroundAlt: "#FFFFFF",
  foreground: "#0F172A",
  primary: "#FACC15",
  primaryDark: "#EAB308",
  primaryLight: "#FEF9C3",
  secondary: "#334155",
  muted: "#F1F5F9",
  mutedForeground: "#64748B",
  border: "rgba(0,0,0,0.06)",
  success: "#22C55E",
  accent: "#8B5CF6",
};

// Features principais com ícones coloridos
const mainFeatures = [
  { 
    icon: MessageSquare, 
    title: "WhatsApp Integrado", 
    desc: "Receba pedidos direto no seu WhatsApp",
    color: "#22C55E",
    bg: "#DCFCE7"
  },
  { 
    icon: Zap, 
    title: "Zero Comissão", 
    desc: "100% do valor do pedido é seu",
    color: "#EAB308",
    bg: "#FEF9C3"
  },
  { 
    icon: Clock, 
    title: "Pronto em 3 min", 
    desc: "Configure e comece a vender hoje",
    color: "#3B82F6",
    bg: "#DBEAFE"
  },
  { 
    icon: Smartphone, 
    title: "QR Code Exclusivo", 
    desc: "Seus clientes pedem pelo celular",
    color: "#8B5CF6",
    bg: "#EDE9FE"
  }
];

// Stats impressionantes
const stats = [
  { value: "10k+", label: "Pedidos/mês" },
  { value: "500+", label: "Restaurantes" },
  { value: "4.9", label: "Avaliação", icon: Star },
  { value: "0%", label: "Comissão" }
];

// Funcionalidades do sistema
const allFeatures = [
  { icon: ShoppingCart, title: "PDV Completo" },
  { icon: ChefHat, title: "Painel Cozinha" },
  { icon: Package, title: "Controle Estoque" },
  { icon: Users, title: "Gestão Mesas" },
  { icon: Ticket, title: "Cupons Promo" },
  { icon: Heart, title: "Fidelidade" },
  { icon: Printer, title: "Impressão Auto" },
  { icon: Bell, title: "Notificações" },
  { icon: BarChart3, title: "Relatórios" }
];

// Depoimentos
const testimonials = [
  {
    name: "Carlos Mendes",
    business: "Burger House",
    text: "Triplicamos nossos pedidos em 2 meses. O melhor investimento que fiz!",
    rating: 5,
    avatar: "🍔"
  },
  {
    name: "Ana Paula",
    business: "Doces da Ana",
    text: "Finalmente livre das taxas absurdas dos apps. Recomendo demais!",
    rating: 5,
    avatar: "🧁"
  },
  {
    name: "Roberto Silva",
    business: "Pizzaria Napoli",
    text: "Sistema incrível, suporte excelente. Meus clientes amam!",
    rating: 5,
    avatar: "🍕"
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [topRatedStores, setTopRatedStores] = useState<any[]>([]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/admin");
      }
    };
    checkAuth();
  }, [navigate]);

  // Load top rated stores
  useEffect(() => {
    const loadTopStores = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("store_id, rating, stores!inner(id, name, slug, logo_url)")
        .order("rating", { ascending: false });
      
      if (data) {
        const storeMap = new Map<string, { total: number; count: number; store: any }>();
        data.forEach((review: any) => {
          const store = review.stores;
          if (store) {
            const existing = storeMap.get(store.id) || { total: 0, count: 0, store };
            existing.total += review.rating;
            existing.count += 1;
            storeMap.set(store.id, existing);
          }
        });
        
        const ranked = Array.from(storeMap.values())
          .map(s => ({ ...s.store, avg_rating: s.total / s.count }))
          .filter(s => s.avg_rating >= 4)
          .sort((a, b) => b.avg_rating - a.avg_rating)
          .slice(0, 3);
        
        setTopRatedStores(ranked);
      }
    };
    loadTopStores();
  }, []);

  // Search stores
  const searchStores = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    const { data } = await supabase
      .from("stores")
      .select("id, name, slug, logo_url, address")
      .ilike("name", `%${query}%`)
      .limit(5);
    
    setSearchResults(data || []);
    setShowResults(true);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchStores(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStores]);

  // Close search on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search]")) setShowResults(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ 
        backgroundColor: COLORS.background,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      {/* Floating Header - Minimal */}
      <header 
        className="fixed top-3 left-3 right-3 z-50 rounded-2xl"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.08)"
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <img 
            src={anotoLogoFull} 
            alt="Anotô" 
            className="h-7 object-contain cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {["recursos", "preços", "depoimentos"].map(item => (
              <button
                key={item}
                onClick={() => scrollTo(item)}
                className="text-sm font-medium capitalize hover:text-amber-600 transition-colors"
                style={{ color: COLORS.secondary }}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLoginModal(true)}
              className="font-medium"
            >
              Entrar
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSignupModal(true)}
              className="rounded-full font-semibold px-5"
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
            >
              Começar grátis
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden border-t border-gray-100 overflow-hidden"
            >
              <div className="p-4 space-y-2">
                {["recursos", "preços", "depoimentos"].map(item => (
                  <button
                    key={item}
                    onClick={() => scrollTo(item)}
                    className="block w-full text-left py-3 px-4 rounded-xl font-medium capitalize hover:bg-gray-50 transition-colors"
                  >
                    {item}
                  </button>
                ))}
                <div className="pt-3 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => { setMobileMenuOpen(false); setShowLoginModal(true); }}
                  >
                    Entrar
                  </Button>
                  <Button
                    className="w-full rounded-xl font-semibold"
                    style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                    onClick={() => { setMobileMenuOpen(false); setShowSignupModal(true); }}
                  >
                    Começar grátis
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 relative overflow-hidden">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${COLORS.primaryLight} 0%, transparent 50%)`
          }}
        />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center lg:text-left"
            >
              {/* Badge */}
              <div 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
                style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}
              >
                <Rocket className="w-3.5 h-3.5" />
                7 dias grátis • Sem cartão
              </div>

              <h1 
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight"
                style={{ color: COLORS.foreground }}
              >
                Delivery sem{" "}
                <span 
                  className="relative inline-block"
                  style={{ color: COLORS.primaryDark }}
                >
                  comissão
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 8C50 2 150 2 198 8" stroke={COLORS.primary} strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </span>
                <br />
                <span style={{ color: COLORS.foreground }}>em 3 minutos</span>
              </h1>
              
              <p 
                className="mt-5 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0"
                style={{ color: COLORS.mutedForeground }}
              >
                Crie seu cardápio digital, receba pedidos via WhatsApp e{" "}
                <strong style={{ color: COLORS.foreground }}>fique com 100% do lucro</strong>.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => setShowSignupModal(true)}
                  className="text-base px-8 py-6 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
                  style={{ 
                    backgroundColor: COLORS.primary, 
                    color: COLORS.foreground,
                    boxShadow: `0 10px 40px ${COLORS.primary}66`
                  }}
                >
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Criar meu cardápio
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("recursos")}
                  className="text-base px-8 py-6 rounded-full font-semibold"
                >
                  Ver recursos
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-5">
                {[
                  { icon: Check, text: "Sem taxa por pedido" },
                  { icon: Shield, text: "Setup em 3 min" },
                  { icon: Zap, text: "Suporte 24h" }
                ].map(item => (
                  <span 
                    key={item.text} 
                    className="flex items-center gap-2 text-sm"
                    style={{ color: COLORS.mutedForeground }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: COLORS.success }} />
                    {item.text}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Mascot */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative flex justify-center items-center"
            >
              {/* Glow */}
              <div 
                className="absolute w-64 h-64 lg:w-80 lg:h-80 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: COLORS.primary }}
              />
              <img
                src={anotoMascotMoto}
                alt="Mascote Anotô"
                className="w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72 object-contain relative z-10"
              />
              {/* Speech bubble */}
              <div 
                className="absolute top-0 right-4 lg:right-8 px-4 py-2 rounded-2xl shadow-lg z-20"
                style={{ backgroundColor: COLORS.backgroundAlt }}
              >
                <span className="font-bold text-sm">Pediu, Chegou! 🛵</span>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {stats.map((stat, i) => (
              <div 
                key={i}
                className="text-center py-5 px-4 rounded-2xl"
                style={{ backgroundColor: COLORS.backgroundAlt, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: COLORS.foreground }}>
                    {stat.value}
                  </span>
                  {stat.icon && <stat.icon className="w-5 h-5" style={{ fill: COLORS.primary, color: COLORS.primary }} />}
                </div>
                <span className="text-xs sm:text-sm mt-1 block" style={{ color: COLORS.mutedForeground }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Search Section */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-xl mx-auto" data-search>
          <div 
            className="flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ 
              backgroundColor: COLORS.backgroundAlt,
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}
          >
            <Search className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.mutedForeground }} />
            <input
              type="text"
              placeholder="Buscar restaurante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              className="flex-1 text-base outline-none bg-transparent"
              style={{ color: COLORS.foreground }}
            />
            {isSearching && (
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.primary, borderTopColor: "transparent" }} />
            )}
          </div>

          {/* Results */}
          {showResults && searchResults.length > 0 && (
            <div 
              className="mt-2 rounded-2xl overflow-hidden shadow-xl"
              style={{ backgroundColor: COLORS.backgroundAlt }}
            >
              {searchResults.map((store) => (
                <button
                  key={store.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left"
                  onClick={() => navigate(`/cardapio/${store.slug}`)}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: COLORS.primaryLight }}
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold">{store.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{store.name}</p>
                    <p className="text-xs truncate" style={{ color: COLORS.mutedForeground }}>{store.address || "Cardápio Digital"}</p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: COLORS.mutedForeground }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="px-4 sm:px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
            >
              <Sparkles className="w-4 h-4" />
              POR QUE ANOTÔ?
            </span>
            <h2 
              className="text-3xl sm:text-4xl font-extrabold"
              style={{ color: COLORS.foreground }}
            >
              Tudo que você precisa,{" "}
              <span style={{ color: COLORS.primaryDark }}>sem complicação</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mainFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-3xl text-center hover:scale-[1.02] transition-transform"
                style={{ backgroundColor: COLORS.backgroundAlt, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: feature.bg }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: COLORS.foreground }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: COLORS.mutedForeground }}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section id="funcionalidades" className="px-4 sm:px-6 py-16" style={{ backgroundColor: COLORS.muted }}>
        <div className="max-w-5xl mx-auto">
          <h3 className="text-center text-xl font-bold mb-8" style={{ color: COLORS.foreground }}>
            + de 15 funcionalidades incluídas
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {allFeatures.map((f) => (
              <div 
                key={f.title}
                className="flex flex-col items-center p-4 rounded-2xl hover:scale-105 transition-transform"
                style={{ backgroundColor: COLORS.backgroundAlt }}
              >
                <f.icon className="w-6 h-6 mb-2" style={{ color: COLORS.primaryDark }} />
                <span className="text-xs font-medium text-center" style={{ color: COLORS.secondary }}>{f.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated Stores */}
      {topRatedStores.length > 0 && (
        <section className="px-4 sm:px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3" style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}>
                <Trophy className="w-3.5 h-3.5" />
                TOP AVALIADOS
              </div>
              <h2 className="text-2xl font-bold" style={{ color: COLORS.foreground }}>Restaurantes em destaque</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {topRatedStores.map((store, i) => (
                <motion.div
                  key={store.id}
                  whileHover={{ y: -4 }}
                  className="p-4 rounded-2xl cursor-pointer"
                  style={{ 
                    backgroundColor: COLORS.backgroundAlt,
                    border: i === 0 ? `2px solid ${COLORS.primary}` : "1px solid rgba(0,0,0,0.05)",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
                  }}
                  onClick={() => navigate(`/cardapio/${store.slug}`)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: i === 0 ? COLORS.primary : i === 1 ? "#E5E7EB" : "#FED7AA",
                        color: COLORS.foreground
                      }}
                    >
                      {i + 1}º
                    </div>
                    <div className="w-11 h-11 rounded-full overflow-hidden" style={{ border: `2px solid ${COLORS.border}` }}>
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: COLORS.primaryLight }}>
                          <span className="font-bold">{store.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                        <span className="text-xs font-medium">{store.avg_rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="preços" className="px-4 sm:px-6 py-20" style={{ backgroundColor: COLORS.primaryLight }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}>
              PREÇO JUSTO
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: COLORS.foreground }}>
              Simples e sem surpresas
            </h2>
            <p className="mt-3 text-base" style={{ color: COLORS.mutedForeground }}>
              Sem taxa por pedido. Sem comissão. Preço fixo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly */}
            <div 
              className="p-8 rounded-3xl"
              style={{ backgroundColor: COLORS.backgroundAlt, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
            >
              <h3 className="text-lg font-semibold" style={{ color: COLORS.mutedForeground }}>Mensal</h3>
              <div className="mt-3">
                <span className="text-5xl font-extrabold" style={{ color: COLORS.foreground }}>R$ 49</span>
                <span className="text-lg" style={{ color: COLORS.mutedForeground }}>/mês</span>
              </div>
              <ul className="mt-6 space-y-3">
                {["Cardápio ilimitado", "Pedidos ilimitados", "Zero taxa por pedido", "Suporte via WhatsApp", "Dashboard completo"].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="w-5 h-5" style={{ color: COLORS.success }} />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full mt-6 rounded-full" 
                variant="outline"
                size="lg"
                onClick={() => setShowSignupModal(true)}
              >
                Começar 7 dias grátis
              </Button>
            </div>

            {/* Annual */}
            <div 
              className="p-8 rounded-3xl relative"
              style={{ 
                backgroundColor: COLORS.primary,
                boxShadow: `0 20px 50px ${COLORS.primary}66`
              }}
            >
              <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: COLORS.foreground, color: COLORS.background }}>
                ECONOMIZE 20%
              </div>
              <h3 className="text-lg font-semibold" style={{ color: COLORS.foreground }}>Anual</h3>
              <div className="mt-3">
                <span className="text-5xl font-extrabold" style={{ color: COLORS.foreground }}>R$ 39</span>
                <span className="text-lg" style={{ color: COLORS.secondary }}>/mês</span>
              </div>
              <p className="text-sm mt-1" style={{ color: COLORS.secondary }}>Cobrado anualmente (R$ 468/ano)</p>
              <ul className="mt-6 space-y-3">
                {["Tudo do plano mensal", "Suporte prioritário", "Consultoria inicial", "Relatórios avançados", "WhatsApp API"].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="w-5 h-5" style={{ color: COLORS.foreground }} />
                    <span className="text-sm" style={{ color: COLORS.foreground }}>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full mt-6 rounded-full font-bold"
                size="lg"
                onClick={() => setShowSignupModal(true)}
                style={{ backgroundColor: COLORS.foreground, color: COLORS.background }}
              >
                Começar 7 dias grátis
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="px-4 sm:px-6 py-20" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark }}>
              DEPOIMENTOS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: COLORS.foreground }}>
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-3xl"
                style={{ backgroundColor: COLORS.muted }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: COLORS.foreground }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: COLORS.primaryLight }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs" style={{ color: COLORS.mutedForeground }}>{t.business}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 py-20">
        <div 
          className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            boxShadow: `0 30px 60px ${COLORS.primary}55`
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: COLORS.foreground }}>
            Pronto para vender mais?
          </h2>
          <p className="mt-4 text-base max-w-md mx-auto" style={{ color: COLORS.secondary }}>
            Comece agora seu teste gratuito de 7 dias. Sem compromisso, sem cartão.
          </p>
          <Button 
            size="lg"
            onClick={() => setShowSignupModal(true)}
            className="mt-8 text-base px-10 py-7 rounded-full font-bold shadow-xl"
            style={{ backgroundColor: COLORS.foreground, color: COLORS.background }}
          >
            Criar meu cardápio grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-10 border-t" style={{ borderColor: COLORS.border }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={anotoMascotMoto} alt="Anotô" className="w-10 h-10 object-contain" />
              <div>
                <span className="font-bold text-lg">Anotô</span>
                <p className="text-xs" style={{ color: COLORS.mutedForeground }}>Pediu, chegou!</p>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {[
                { label: "FAQ", path: "/faq" },
                { label: "Privacidade", path: "/privacidade" },
                { label: "Termos", path: "/termos" },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="text-sm hover:text-amber-600 transition-colors"
                  style={{ color: COLORS.mutedForeground }}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => navigate("/instalar")}
                className="flex items-center gap-2 text-sm hover:text-amber-600 transition-colors"
                style={{ color: COLORS.mutedForeground }}
              >
                <Download className="w-4 h-4" />
                Instalar App
              </button>
            </div>
          </div>
          <div className="mt-6 pt-6 text-center" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <p className="text-sm" style={{ color: COLORS.mutedForeground }}>
              © {new Date().getFullYear()} Anotô. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
