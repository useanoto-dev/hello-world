// Landing page header component
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Menu, X, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import anotoLogoHeader from "@/assets/anoto-logo-header.avif";

const COLORS = {
  foreground: "#1D1D1F",
  muted: "#86868B",
  primary: "#FFC107",
};

const GLASS = {
  header: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
  },
};

interface LandingHeaderProps {
  onOpenSignup: () => void;
  onOpenLogin: () => void;
}

export function LandingHeader({ onOpenSignup, onOpenLogin }: LandingHeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuAnimating, setMenuAnimating] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
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
        <img src={anotoLogoHeader} alt="Anotô?" className="h-10 sm:h-12 object-contain" />
        
        <nav className="hidden md:flex items-center gap-6">
          {["Recursos", "Funcionalidades", "Preços", "Depoimentos"].map((item) => (
            <button 
              key={item} 
              onClick={() => scrollToSection(item.toLowerCase())} 
              className="text-xs font-medium transition-colors hover:text-amber-500"
              style={{ color: COLORS.muted, background: "none", border: "none", cursor: "pointer" }}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={() => navigate("/explorar")} 
            className="p-2 rounded-full hover:bg-amber-50"
            style={{ color: COLORS.foreground, background: "none", border: "none" }} 
            title="Explorar"
          >
            <Store className="w-4 h-4" style={{ color: '#c2185b' }} />
          </button>
          <Button variant="ghost" size="sm" onClick={onOpenLogin} className="text-xs">Entrar</Button>
          <Button 
            size="sm" 
            onClick={onOpenSignup} 
            className="text-xs font-semibold rounded-full px-4"
            style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
          >
            Começar grátis
          </Button>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <button onClick={() => navigate("/explorar")} className="p-2" style={{ background: "none", border: "none" }}>
            <Store className="w-5 h-5" style={{ color: '#c2185b' }} />
          </button>
          <button onClick={onOpenLogin} style={{ color: COLORS.foreground, background: "none", border: "none" }}>
            <User className="w-5 h-5" />
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: COLORS.foreground, background: "none", border: "none" }}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: "auto" }} 
          exit={{ opacity: 0, height: 0 }}
          onAnimationStart={() => setMenuAnimating(true)} 
          onAnimationComplete={() => setMenuAnimating(false)}
          className="md:hidden" 
          style={{ backgroundColor: "#fff" }}
        >
          <div className="px-4 py-3 space-y-1">
            {["Recursos", "Funcionalidades", "Preços", "Depoimentos"].map((item) => (
              <button 
                key={item} 
                onClick={() => scrollToSection(item.toLowerCase())}
                className="block w-full text-left py-2.5 px-3 rounded-xl text-sm hover:bg-amber-50"
                style={{ color: COLORS.foreground, background: "none", border: "none" }}
              >
                {item}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </header>
  );
}
