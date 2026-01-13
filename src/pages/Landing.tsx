// Landing Page - Anotô Cardápio Digital - iOS Style Immersive Experience
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView, useAnimation, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  QrCode, BarChart3, Star, Check, Menu, X,
  ArrowRight, Smartphone, Zap, Shield, Search, Store, MapPin, Download, Trophy, User,
  MessageSquare, Send, Printer, Chrome, ShoppingCart, ChefHat, Package, 
  Users, Ticket, Heart, ClipboardList, Bell, Sparkles, Play
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

// Cores fixas da landing (não usa CSS variables para não ser afetada pelo dark mode)
const COLORS = {
  background: "#F8F9FA",
  backgroundAlt: "#FFFFFF",
  foreground: "#1A1A1A",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  primaryLight: "#FFF8E1",
  secondary: "#424242",
  muted: "#F5F5F5",
  mutedForeground: "#6B7280",
  border: "rgba(0, 0, 0, 0.06)",
  card: "#FFFFFF",
  success: "#10B981",
};

// iOS-style Glassmorphism
const GLASS = {
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
  },
  cardElevated: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12)",
  },
  header: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
  },
};

// Integrações com cores vibrantes
const integrations = [
  {
    icon: MessageSquare,
    title: "ChatBot WhatsApp",
    description: "Atendimento 24h automatizado",
    gradient: "from-green-400 to-green-600",
    iconColor: "#FFFFFF"
  },
  {
    icon: Send,
    title: "Disparo em Massa",
    description: "Promoções para toda sua base",
    gradient: "from-emerald-400 to-teal-500",
    iconColor: "#FFFFFF"
  },
  {
    icon: Bell,
    title: "Notificações Auto",
    description: "Status do pedido em tempo real",
    gradient: "from-blue-400 to-blue-600",
    iconColor: "#FFFFFF"
  },
  {
    icon: Printer,
    title: "Impressão Térmica",
    description: "Comandas automáticas",
    gradient: "from-orange-400 to-red-500",
    iconColor: "#FFFFFF"
  },
  {
    icon: Chrome,
    title: "Login Google",
    description: "Acesso com um clique",
    gradient: "from-indigo-400 to-purple-500",
    iconColor: "#FFFFFF"
  }
];

// Funcionalidades do Sistema
const systemFeatures = [
  { icon: ShoppingCart, title: "PDV Completo", description: "Atendimento presencial integrado" },
  { icon: ChefHat, title: "KDS Cozinha", description: "Kanban visual para pedidos" },
  { icon: Package, title: "Estoque", description: "Controle e alertas automáticos" },
  { icon: Users, title: "Mesas", description: "Ocupação e comandas" },
  { icon: Ticket, title: "Cupons", description: "Descontos promocionais" },
  { icon: Heart, title: "Fidelidade", description: "Programa de pontos" },
  { icon: ClipboardList, title: "CRM", description: "Histórico de clientes" },
  { icon: Star, title: "Avaliações", description: "Feedback dos clientes" },
  { icon: QrCode, title: "QR Code", description: "Pedidos via celular" }
];

// Depoimentos
const testimonials = [
  {
    name: "João Silva",
    business: "Pizzaria do João",
    text: "Depois do Anotô?, meu delivery triplicou. Simples de usar!",
    rating: 5,
    avatar: "👨‍🍳"
  },
  {
    name: "Maria Santos",
    business: "Café da Maria",
    text: "Finalmente um cardápio digital que não cobra comissão absurda.",
    rating: 5,
    avatar: "👩‍🍳"
  },
  {
    name: "Carlos Oliveira",
    business: "Hamburgueria CO",
    text: "Em 5 minutos estava tudo funcionando. Recomendo demais!",
    rating: 5,
    avatar: "🧑‍🍳"
  }
];

// Animated Section Component
interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const AnimatedSection = ({ children, className = "", delay = 0 }: AnimatedSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { 
          opacity: 1, 
          y: 0, 
          transition: { 
            duration: 0.7, 
            delay,
            ease: [0.25, 0.46, 0.45, 0.94]
          } 
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Floating particles for hero
const FloatingParticle = ({ delay, duration, x, y }: { delay: number; duration: number; x: number; y: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{ 
      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
      left: `${x}%`,
      top: `${y}%`,
    }}
    animate={{
      y: [-20, 20, -20],
      opacity: [0.3, 0.7, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
);

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Top rated stores
  const [topRatedStores, setTopRatedStores] = useState<{
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
    slug: string;
    avg_rating: number;
    review_count: number;
  }[]>([]);
  
  // Form states
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Parallax scroll
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("store_id")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (profile?.store_id) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/dashboard/onboarding", { replace: true });
        }
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
          
          if (profile?.store_id) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/dashboard/onboarding", { replace: true });
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Search
  const searchStores = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo_url, address, slug")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .limit(8);

      if (error) throw error;
      setSearchResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchStores(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStores]);

  // Auth handlers
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!acceptTerms) {
      toast.error("Aceite os Termos de Uso");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: storeName }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      if (authData.user.identities?.length === 0) {
        toast.error("Este email já está cadastrado.");
        setLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .insert({
          name: storeName,
          slug: generateStoreSlug(storeName),
          primary_color: "#FFC107"
        })
        .select()
        .single();

      if (storeError) throw storeError;

      const finalSlug = generateStoreSlug(storeName, storeData.id);
      await supabase
        .from("stores")
        .update({ slug: finalSlug })
        .eq("id", storeData.id);

      await supabase
        .from("profiles")
        .update({ store_id: storeData.id, is_owner: true })
        .eq("id", authData.user.id);

      await supabase
        .from("subscriptions")
        .insert({ store_id: storeData.id, status: "trial" });

      toast.success("Conta criada com sucesso!");
      setAuthOpen(false);
      navigate("/dashboard/onboarding");
      
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado!");
      setAuthOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-container]')) {
        setShowResults(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch top rated stores
  useEffect(() => {
    const fetchTopRatedStores = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        const { data: reviews, error } = await supabase
          .from("reviews")
          .select("store_id, rating")
          .gte("created_at", startOfMonth);

        if (error) throw error;
        if (!reviews || reviews.length === 0) return;

        const storeRatings: Record<string, { total: number; count: number }> = {};
        reviews.forEach(review => {
          if (!storeRatings[review.store_id]) {
            storeRatings[review.store_id] = { total: 0, count: 0 };
          }
          storeRatings[review.store_id].total += review.rating;
          storeRatings[review.store_id].count += 1;
        });

        const sortedStores = Object.entries(storeRatings)
          .map(([storeId, data]) => ({
            storeId,
            avg: data.total / data.count,
            count: data.count
          }))
          .sort((a, b) => b.avg !== a.avg ? b.avg - a.avg : b.count - a.count)
          .slice(0, 3);

        if (sortedStores.length === 0) return;

        const storeIds = sortedStores.map(s => s.storeId);
        const { data: stores, error: storeError } = await supabase
          .from("stores")
          .select("id, name, logo_url, address, slug")
          .in("id", storeIds)
          .eq("is_active", true);

        if (storeError) throw storeError;
        if (!stores || stores.length === 0) return;

        const topStores = sortedStores
          .map(s => {
            const store = stores.find(st => st.id === s.storeId);
            if (!store) return null;
            return { ...store, avg_rating: Math.round(s.avg * 10) / 10, review_count: s.count };
          })
          .filter(Boolean) as typeof topRatedStores;

        setTopRatedStores(topStores);
      } catch (error) {
        console.error("Error fetching top rated stores:", error);
      }
    };
    fetchTopRatedStores();
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.background, color: COLORS.foreground }}>
      {/* iOS-style Header - Centered Pill */}
      <header 
        className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-[95%] max-w-5xl"
        style={{ 
          ...GLASS.header,
          borderRadius: "9999px",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between">
          <motion.img 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            src={anotoLogoFull} 
            alt="Anotô?" 
            className="h-10 sm:h-12 object-contain" 
          />
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {["Recursos", "Funcionalidades", "Preços", "Depoimentos"].map((item, i) => (
              <motion.button 
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => scrollToSection(item.toLowerCase())} 
                className="text-sm font-medium transition-all hover:text-amber-500"
                style={{ color: COLORS.mutedForeground, background: "none", border: "none", cursor: "pointer" }}
              >
                {item}
              </motion.button>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowLoginModal(true)}
              className="text-sm font-medium"
            >
              Entrar
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                size="sm"
                onClick={() => setShowSignupModal(true)}
                className="text-sm font-semibold rounded-full px-6"
                style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              >
                Começar grátis
              </Button>
            </motion.div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setShowLoginModal(true)}
              style={{ color: COLORS.foreground, background: "none", border: "none" }}
            >
              <User className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: COLORS.foreground, background: "none", border: "none" }}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.98)" }}
            >
              <div className="px-4 py-4 space-y-2">
                {["Recursos", "Funcionalidades", "Preços", "Depoimentos"].map((item) => (
                  <button 
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase())}
                    className="block w-full text-left py-3 px-4 rounded-xl text-sm font-medium transition-colors hover:bg-amber-50"
                    style={{ color: COLORS.foreground, background: "none", border: "none" }}
                  >
                    {item}
                  </button>
                ))}
                <Button 
                  className="w-full mt-4 rounded-full"
                  onClick={() => { setMobileMenuOpen(false); setShowSignupModal(true); }}
                  style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                >
                  Começar grátis
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section - Immersive */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, ${COLORS.primaryLight} 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(255, 224, 130, 0.3) 0%, transparent 50%),
              linear-gradient(180deg, ${COLORS.background} 0%, ${COLORS.backgroundAlt} 100%)
            `
          }}
        />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <FloatingParticle 
              key={i} 
              delay={i * 0.3} 
              duration={3 + i * 0.5}
              x={10 + i * 12}
              y={20 + (i % 3) * 25}
            />
          ))}
        </div>
        
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Mascot on LEFT with smoke animation */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2, type: "spring", damping: 20 }}
              className="relative hidden lg:flex justify-center items-center order-1"
            >
              {/* Glow behind mascot */}
              <div 
                className="absolute w-96 h-96 rounded-full"
                style={{ 
                  background: `radial-gradient(circle, ${COLORS.primary}30 0%, transparent 70%)`,
                  filter: "blur(60px)"
                }}
              />
              
              {/* Smoke particles behind the moto */}
              <div className="absolute left-0 bottom-16 z-0">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 8 + i * 4,
                      height: 8 + i * 4,
                      background: `rgba(200, 220, 240, ${0.6 - i * 0.08})`,
                      left: -20 - i * 15,
                      bottom: 10 + (i % 2) * 8,
                    }}
                    animate={{
                      x: [-10, -40 - i * 10],
                      y: [0, -15 - i * 5, -10],
                      opacity: [0.7, 0.4, 0],
                      scale: [0.8, 1.3, 1.8],
                    }}
                    transition={{
                      duration: 2 + i * 0.3,
                      delay: i * 0.15,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
              
              {/* Mascot */}
              <motion.img
                src={anotoMascotMoto}
                alt="Mascote Anotô na Moto"
                className="w-80 h-80 object-contain relative z-10"
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 1, 0, -1, 0]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Speech Bubble */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.8, type: "spring", damping: 15 }}
                className="absolute -top-2 right-4 z-20"
              >
                <motion.div 
                  className="px-5 py-3 rounded-2xl relative"
                  style={{ ...GLASS.cardElevated }}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="font-bold text-base" style={{ color: COLORS.foreground }}>
                    Pediu, Chegou! 🛵
                  </span>
                  {/* Bubble tail */}
                  <div 
                    className="absolute -bottom-2 left-8 w-4 h-4 rotate-45"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.95)" }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Text Content on RIGHT */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center lg:text-left order-2"
            >
              {/* Badge */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ backgroundColor: "rgba(255, 193, 7, 0.15)" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: COLORS.primaryDark }} />
                <span className="text-sm font-medium" style={{ color: COLORS.primaryDark }}>
                  #1 em Cardápios Digitais
                </span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Seu delivery{" "}
                <span 
                  className="relative"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.primary})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  sem comissão
                  <motion.div 
                    className="absolute -bottom-1 left-0 right-0 h-1 rounded-full"
                    style={{ backgroundColor: COLORS.primary }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  />
                </span>
                <br />em 3 minutos
              </h1>
              
              <p className="mt-6 text-lg sm:text-xl max-w-xl mx-auto lg:mx-0" style={{ color: COLORS.mutedForeground }}>
                Crie seu cardápio digital, receba pedidos via WhatsApp e gerencie tudo em um único lugar. 
                <strong className="font-semibold" style={{ color: COLORS.foreground }}> Zero taxas por pedido.</strong>
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    size="lg"
                    onClick={() => setShowSignupModal(true)}
                    className="text-lg px-8 py-6 rounded-full shadow-lg"
                    style={{ 
                      backgroundColor: COLORS.primary, 
                      color: COLORS.foreground,
                      fontWeight: 600,
                      boxShadow: "0 10px 40px rgba(255, 193, 7, 0.4)"
                    }}
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Começar grátis
                  </Button>
                </motion.div>
              </div>
              
              {/* Trust badges */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-6"
              >
                {[
                  { icon: Check, text: "7 dias grátis" },
                  { icon: Shield, text: "Sem cartão" },
                  { icon: Zap, text: "Setup em 3 min" }
                ].map((item, i) => (
                  <span key={item.text} className="flex items-center gap-2 text-sm" style={{ color: COLORS.mutedForeground }}>
                    <item.icon className="w-4 h-4" style={{ color: COLORS.success }} />
                    {item.text}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Search Section */}
      <AnimatedSection className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto" data-search-container>
          <div className="relative">
            <div 
              className="flex items-center gap-3 px-5 rounded-2xl"
              style={{ ...GLASS.cardElevated }}
            >
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.mutedForeground }} />
              <input
                type="text"
                placeholder="Buscar estabelecimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                className="flex-1 py-4 text-base outline-none bg-transparent"
                style={{ color: COLORS.foreground }}
              />
              {isSearching && (
                <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.primary, borderTopColor: "transparent" }} />
              )}
            </div>

            {/* Results */}
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                style={{ ...GLASS.cardElevated }}
              >
                <div className="py-2 max-h-80 overflow-y-auto">
                  {searchResults.map((store) => (
                    <button
                      key={store.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left"
                      onClick={() => navigate(`/cardapio/${store.slug}`)}
                    >
                      <div 
                        className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ background: store.logo_url ? "transparent" : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})` }}
                      >
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base font-bold">{store.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{store.name}</p>
                        <p className="text-xs truncate" style={{ color: COLORS.mutedForeground }}>{store.address || "Cardápio Digital"}</p>
                      </div>
                      <ArrowRight className="w-4 h-4" style={{ color: COLORS.mutedForeground }} />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* Integrations - Yellow/White Section */}
      <section id="recursos" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ 
            background: `linear-gradient(180deg, ${COLORS.backgroundAlt} 0%, ${COLORS.primaryLight} 50%, ${COLORS.backgroundAlt} 100%)`
          }}
        />
        
        <div className="relative max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <motion.span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="w-4 h-4" />
              INTEGRAÇÕES PODEROSAS
            </motion.span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Tudo conectado,{" "}
              <span style={{ color: COLORS.primaryDark }}>automatizado</span>
            </h2>
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: COLORS.mutedForeground }}>
              WhatsApp, impressoras térmicas e mais - tudo funcionando sem você precisar fazer nada
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {integrations.map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.1}>
                <motion.div 
                  className="rounded-3xl p-6 h-full text-center"
                  style={{ ...GLASS.cardElevated }}
                  whileHover={{ y: -8, boxShadow: "0 30px 60px rgba(0, 0, 0, 0.12)" }}
                >
                  <motion.div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${item.gradient}`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <item.icon className="w-7 h-7" style={{ color: item.iconColor }} />
                  </motion.div>
                  <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                  <p className="text-sm" style={{ color: COLORS.mutedForeground }}>{item.description}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* System Features */}
      <section id="funcionalidades" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span 
              className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4"
              style={{ backgroundColor: `${COLORS.primary}20`, color: COLORS.primaryDark }}
            >
              FUNCIONALIDADES COMPLETAS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Tudo que seu negócio{" "}
              <span style={{ color: COLORS.primaryDark }}>precisa</span>
            </h2>
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: COLORS.mutedForeground }}>
              Do pedido à cozinha, do estoque ao cliente - gestão completa em um só lugar
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {systemFeatures.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.05}>
                <motion.div 
                  className="rounded-2xl p-5 h-full text-center"
                  style={{ ...GLASS.card }}
                  whileHover={{ 
                    scale: 1.05,
                    backgroundColor: COLORS.primaryLight
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${COLORS.primary}20` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: COLORS.primaryDark }} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs" style={{ color: COLORS.mutedForeground }}>{feature.description}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated Stores */}
      {topRatedStores.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ backgroundColor: `${COLORS.primary}20` }}>
                <Trophy className="w-4 h-4" style={{ color: COLORS.primaryDark }} />
                <span className="text-sm font-semibold" style={{ color: COLORS.primaryDark }}>DESTAQUES DO MÊS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">Os melhores avaliados</h2>
            </AnimatedSection>

            <div className="grid sm:grid-cols-3 gap-4">
              {topRatedStores.map((store, i) => (
                <AnimatedSection key={store.id} delay={i * 0.1}>
                  <motion.div
                    className="rounded-2xl p-4 cursor-pointer"
                    style={{
                      ...GLASS.cardElevated,
                      border: i === 0 ? `2px solid ${COLORS.primary}` : "1px solid rgba(0,0,0,0.05)"
                    }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/cardapio/${store.slug}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{
                          backgroundColor: i === 0 ? COLORS.primary : i === 1 ? "#E5E7EB" : "#FED7AA",
                          color: i === 0 ? COLORS.foreground : COLORS.mutedForeground
                        }}
                      >
                        {i + 1}º
                      </div>
                      <div 
                        className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                        style={{ border: `2px solid ${COLORS.border}` }}
                      >
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
                          <Star className="w-3 h-3" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                          <span className="text-xs font-medium">{store.avg_rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="preços" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28" style={{ backgroundColor: COLORS.primaryLight }}>
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}>
              PREÇO JUSTO
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Simples, sem surpresas
            </h2>
            <p className="mt-4 text-lg" style={{ color: COLORS.mutedForeground }}>
              Sem taxa por pedido. Sem comissão. Preço fixo.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly */}
            <AnimatedSection>
              <motion.div 
                className="rounded-3xl p-8 h-full"
                style={{ ...GLASS.cardElevated }}
                whileHover={{ y: -8 }}
              >
                <h3 className="text-lg font-semibold" style={{ color: COLORS.mutedForeground }}>Mensal</h3>
                <div className="mt-4">
                  <span className="text-5xl font-bold">R$ 49</span>
                  <span className="text-lg" style={{ color: COLORS.mutedForeground }}>/mês</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {["Cardápio ilimitado", "Pedidos ilimitados", "Zero taxa por pedido", "Suporte via WhatsApp", "Dashboard completo", "QR Code personalizado"].map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.success }} />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-8 rounded-full" 
                  variant="outline"
                  size="lg"
                  onClick={() => setShowSignupModal(true)}
                >
                  Começar 7 dias grátis
                </Button>
              </motion.div>
            </AnimatedSection>

            {/* Annual */}
            <AnimatedSection delay={0.1}>
              <motion.div 
                className="rounded-3xl p-8 relative h-full"
                style={{ 
                  backgroundColor: COLORS.primary,
                  boxShadow: "0 20px 60px rgba(255, 193, 7, 0.4)"
                }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: COLORS.foreground, color: COLORS.background }}>
                  ECONOMIZE 20%
                </div>
                <h3 className="text-lg font-semibold" style={{ color: COLORS.foreground }}>Anual</h3>
                <div className="mt-4">
                  <span className="text-5xl font-bold" style={{ color: COLORS.foreground }}>R$ 39</span>
                  <span className="text-lg" style={{ color: COLORS.secondary }}>/mês</span>
                </div>
                <p className="mt-1 text-sm" style={{ color: COLORS.secondary }}>Cobrado anualmente (R$ 468/ano)</p>
                <ul className="mt-8 space-y-4">
                  {["Tudo do plano mensal", "Suporte prioritário", "Consultoria inicial", "Cardápio premium", "Relatórios avançados", "Integração WhatsApp API"].map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.foreground }} />
                      <span className="text-sm" style={{ color: COLORS.foreground }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-8 rounded-full"
                  size="lg"
                  onClick={() => setShowSignupModal(true)}
                  style={{ backgroundColor: COLORS.foreground, color: COLORS.background }}
                >
                  Começar 7 dias grátis
                </Button>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: `${COLORS.primary}20`, color: COLORS.primaryDark }}>
              DEPOIMENTOS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              O que dizem nossos{" "}
              <span style={{ color: COLORS.primaryDark }}>clientes</span>
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <motion.div 
                  className="rounded-3xl p-6 h-full"
                  style={{ ...GLASS.cardElevated }}
                  whileHover={{ y: -8 }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="w-5 h-5" style={{ fill: COLORS.primary, color: COLORS.primary }} />
                    ))}
                  </div>
                  <p className="text-base italic mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: COLORS.primaryLight }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs" style={{ color: COLORS.mutedForeground }}>{t.business}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <AnimatedSection>
        <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 overflow-hidden">
          <motion.div 
            className="max-w-4xl mx-auto rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 lg:p-16 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              boxShadow: "0 30px 80px rgba(255, 193, 7, 0.35)"
            }}
            whileHover={{ scale: 1.01 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold" style={{ color: COLORS.foreground }}>
                Pronto para vender mais?
              </h2>
              <p className="mt-4 text-base sm:text-lg max-w-xl mx-auto px-2" style={{ color: COLORS.secondary }}>
                Comece agora seu teste gratuito de 7 dias. Sem compromisso, sem cartão.
              </p>
              <motion.div className="mt-8" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button 
                  size="lg"
                  onClick={() => setShowSignupModal(true)}
                  className="text-base sm:text-lg px-6 sm:px-10 py-6 sm:py-7 rounded-full shadow-xl w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
                  style={{ backgroundColor: COLORS.foreground, color: COLORS.background, fontWeight: 600 }}
                >
                  <span className="truncate">Criar meu cardápio grátis</span>
                  <ArrowRight className="ml-2 w-5 h-5 flex-shrink-0" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </AnimatedSection>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-8 py-10" style={{ backgroundColor: COLORS.backgroundAlt }}>
        <div className="max-w-7xl mx-auto">
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
                  className="text-sm hover:text-amber-500 transition-colors"
                  style={{ color: COLORS.mutedForeground, background: "none", border: "none", cursor: "pointer" }}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => navigate("/instalar")}
                className="flex items-center gap-2 text-sm hover:text-amber-500 transition-colors"
                style={{ color: COLORS.mutedForeground, background: "none", border: "none", cursor: "pointer" }}
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

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="mx-4 max-w-md rounded-3xl" style={{ ...GLASS.cardElevated }}>
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              {isLogin ? "Entrar na sua conta" : "Criar sua conta grátis"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4 mt-4">
            {!isLogin && (
              <div>
                <Label htmlFor="storeName" className="text-sm">Nome do estabelecimento</Label>
                <Input
                  id="storeName"
                  placeholder="Ex: Pizzaria do João"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>

            {!isLogin && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-500"
                  disabled={loading}
                />
                <span className="text-xs" style={{ color: COLORS.mutedForeground }}>
                  Li e aceito os{" "}
                  <button type="button" onClick={() => navigate("/termos")} className="text-amber-600 hover:underline font-medium" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Termos de Uso
                  </button>{" "}
                  e a{" "}
                  <button type="button" onClick={() => navigate("/privacidade")} className="text-amber-600 hover:underline font-medium" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Política de Privacidade
                  </button>
                </span>
              </label>
            )}

            <Button 
              type="submit" 
              className="w-full rounded-full"
              disabled={loading || (!isLogin && !acceptTerms)}
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground, fontWeight: 600 }}
            >
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta grátis"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
              style={{ color: COLORS.mutedForeground, background: "none", border: "none", cursor: "pointer" }}
            >
              {isLogin ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
