// Onboarding Wizard - Anotô SaaS
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, LayoutDashboard, Bell, Settings, ArrowRight, ArrowLeft, 
  Check, Loader2, Users, BarChart3, Printer, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const slideIn = {
  hidden: { opacity: 0, x: -20 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 20 }
  }
};

const barGrow = {
  hidden: { scaleY: 0 },
  show: { 
    scaleY: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
  }
};

// Animated Mockup Components
const CardapioMockup = () => (
  <motion.div 
    className="bg-gradient-to-b from-muted to-background rounded-xl p-4 space-y-3"
    variants={staggerContainer}
    initial="hidden"
    animate="show"
  >
    <motion.div className="flex items-center gap-3" variants={slideIn}>
      <motion.div 
        className="w-10 h-10 rounded-full bg-primary/20"
        variants={scaleIn}
      />
      <div className="flex-1">
        <motion.div className="h-3 w-24 bg-foreground/20 rounded" variants={slideIn} />
        <motion.div className="h-2 w-16 bg-foreground/10 rounded mt-1" variants={slideIn} />
      </div>
    </motion.div>
    <motion.div 
      className="grid grid-cols-2 gap-2"
      variants={staggerContainer}
    >
      {[1, 2, 3, 4].map((i) => (
        <motion.div 
          key={i} 
          className="bg-card rounded-lg p-2 space-y-2"
          variants={staggerItem}
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
        >
          <motion.div 
            className="aspect-square bg-muted rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
          <motion.div className="h-2 w-full bg-foreground/10 rounded" />
          <motion.div className="h-3 w-12 bg-primary/30 rounded" />
        </motion.div>
      ))}
    </motion.div>
  </motion.div>
);

const KanbanMockup = () => {
  const statuses = ["Novo", "Preparando", "Pronto", "Entregue"];
  const cardCounts = [2, 1, 1, 0];
  
  return (
    <motion.div 
      className="bg-gradient-to-b from-muted to-background rounded-xl p-4"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="grid grid-cols-4 gap-2">
        {statuses.map((status, idx) => (
          <motion.div 
            key={status} 
            className="space-y-2"
            variants={staggerItem}
          >
            <motion.div 
              className="text-[10px] font-medium text-center text-muted-foreground"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              {status}
            </motion.div>
            {[...Array(cardCounts[idx])].map((_, i) => (
              <motion.div 
                key={i} 
                className="bg-card rounded-lg p-2 space-y-1"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  delay: 0.3 + idx * 0.15 + i * 0.1,
                  type: "spring" as const,
                  stiffness: 300
                }}
                whileHover={{ 
                  x: 3,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  transition: { duration: 0.2 }
                }}
              >
                <div className="h-2 w-full bg-foreground/10 rounded" />
                <div className="h-2 w-8 bg-primary/30 rounded" />
              </motion.div>
            ))}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const PrinterMockup = () => (
  <motion.div 
    className="bg-gradient-to-b from-muted to-background rounded-xl p-4 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div 
      className="bg-white rounded-lg p-3 shadow-lg w-32 space-y-2"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        type: "spring" as const, 
        stiffness: 200, 
        damping: 15,
        delay: 0.2 
      }}
    >
      <motion.div 
        className="text-center border-b border-dashed border-gray-300 pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div 
          className="h-2 w-16 mx-auto bg-gray-200 rounded"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        />
        <motion.div 
          className="h-1.5 w-12 mx-auto bg-gray-100 rounded mt-1"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        />
      </motion.div>
      <motion.div 
        className="space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {[0, 1].map((i) => (
          <motion.div 
            key={i}
            className="flex justify-between"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
          >
            <div className="h-1.5 w-12 bg-gray-200 rounded" />
            <div className="h-1.5 w-6 bg-gray-200 rounded" />
          </motion.div>
        ))}
      </motion.div>
      <motion.div 
        className="border-t border-dashed border-gray-300 pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div 
          className="h-2 w-full bg-gray-200 rounded"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.1, duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  </motion.div>
);

const ChartMockup = () => {
  const barHeights = [40, 65, 45, 80, 55, 70, 90];
  
  return (
    <motion.div 
      className="bg-gradient-to-b from-muted to-background rounded-xl p-4 space-y-3"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div className="flex gap-2" variants={staggerContainer}>
        {[1, 2, 3].map((i) => (
          <motion.div 
            key={i} 
            className="flex-1 bg-card rounded-lg p-2 text-center"
            variants={staggerItem}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div 
              className="h-2 w-8 mx-auto bg-foreground/10 rounded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            />
            <motion.div 
              className="h-3 w-12 mx-auto bg-primary/30 rounded mt-1"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
          </motion.div>
        ))}
      </motion.div>
      <div className="flex items-end gap-1 h-16">
        {barHeights.map((h, i) => (
          <motion.div 
            key={i} 
            className="flex-1 bg-primary/30 rounded-t origin-bottom"
            style={{ height: `${h}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ 
              delay: 0.4 + i * 0.08,
              type: "spring" as const,
              stiffness: 200,
              damping: 15
            }}
            whileHover={{ 
              backgroundColor: "hsl(var(--primary) / 0.5)",
              transition: { duration: 0.2 }
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

const CRMMockup = () => (
  <motion.div 
    className="bg-gradient-to-b from-muted to-background rounded-xl p-4 space-y-2"
    variants={staggerContainer}
    initial="hidden"
    animate="show"
  >
    {[1, 2, 3].map((i) => (
      <motion.div 
        key={i} 
        className="bg-card rounded-lg p-2 flex items-center gap-3"
        variants={staggerItem}
        whileHover={{ 
          x: 5, 
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          transition: { duration: 0.2 }
        }}
      >
        <motion.div 
          className="w-8 h-8 rounded-full bg-primary/20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            delay: 0.3 + i * 0.15,
            type: "spring" as const,
            stiffness: 400
          }}
        />
        <div className="flex-1">
          <motion.div 
            className="h-2 w-20 bg-foreground/15 rounded"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4 + i * 0.15 }}
          />
          <motion.div 
            className="h-1.5 w-12 bg-foreground/10 rounded mt-1"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5 + i * 0.15 }}
          />
        </div>
        <motion.div 
          className="text-right"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 + i * 0.15 }}
        >
          <div className="h-2 w-10 bg-green-500/30 rounded" />
        </motion.div>
      </motion.div>
    ))}
  </motion.div>
);

const features = [
  {
    id: 1,
    title: "Cardápio Digital",
    description: "Seu cardápio online profissional, acessível por QR Code ou link. Clientes fazem pedidos direto pelo celular.",
    icon: ShoppingBag,
    color: "bg-orange-500",
    highlights: [
      "Produtos com fotos e descrições",
      "Categorias organizadas",
      "Personalizações e adicionais",
      "Carrinho inteligente"
    ],
    MockupComponent: CardapioMockup
  },
  {
    id: 2,
    title: "Gestão de Pedidos",
    description: "Painel Kanban em tempo real. Acompanhe cada pedido do recebimento até a entrega.",
    icon: LayoutDashboard,
    color: "bg-blue-500",
    highlights: [
      "Notificações instantâneas",
      "Status em tempo real",
      "Histórico completo",
      "Filtros por data"
    ],
    MockupComponent: KanbanMockup
  },
  {
    id: 3,
    title: "Impressão Térmica",
    description: "Imprima comandas automaticamente na sua impressora térmica. Integração direta via navegador.",
    icon: Printer,
    color: "bg-purple-500",
    highlights: [
      "Impressão automática",
      "Comandas formatadas",
      "Sem software extra",
      "Compatível com 80mm"
    ],
    MockupComponent: PrinterMockup
  },
  {
    id: 4,
    title: "Relatórios e Analytics",
    description: "Acompanhe vendas, produtos mais pedidos e horários de pico. Dados para decisões inteligentes.",
    icon: BarChart3,
    color: "bg-green-500",
    highlights: [
      "Gráficos de vendas",
      "Produtos populares",
      "Horários de pico",
      "Ticket médio"
    ],
    MockupComponent: ChartMockup
  },
  {
    id: 5,
    title: "CRM de Clientes",
    description: "Histórico de pedidos por cliente, notas privadas e valor total gasto. Fidelize seus clientes.",
    icon: Users,
    color: "bg-pink-500",
    highlights: [
      "Histórico por cliente",
      "Notas e observações",
      "Total de pedidos",
      "Valor gasto"
    ],
    MockupComponent: CRMMockup
  }
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  
  const [store, setStore] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalSteps = features.length;

  // Fetch store data
  useEffect(() => {
    const fetchStore = async () => {
      if (!profile?.store_id) {
        setStoreLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("id", profile.store_id)
          .single();

        if (error) throw error;
        setStore(data);
      } catch (error) {
        console.error("Error fetching store:", error);
        toast.error("Erro ao carregar dados da loja");
      } finally {
        setStoreLoading(false);
      }
    };

    if (!authLoading) {
      fetchStore();
    }
  }, [profile?.store_id, authLoading]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        navigate("/");
        return;
      }

      let storeId = store?.id;

      // If user doesn't have a store yet, create one
      if (!storeId) {
        // Generate a unique slug from email or random
        const baseSlug = user.email?.split("@")[0] || `loja-${Date.now()}`;
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
        
        // Create the store
        const { data: newStore, error: storeError } = await supabase
          .from("stores")
          .insert({
            name: profile?.full_name ? `Loja de ${profile.full_name}` : "Minha Loja",
            slug: slug,
            onboarding_completed: true,
          })
          .select()
          .single();

        if (storeError) throw storeError;
        
        storeId = newStore.id;

        // Update the user's profile with the new store_id
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ store_id: storeId, is_owner: true })
          .eq("id", user.id);

        if (profileError) throw profileError;
      } else {
        // Just mark onboarding as completed
        const { error } = await supabase
          .from("stores")
          .update({ onboarding_completed: true })
          .eq("id", storeId);
          
        if (error) throw error;
      }
      
      toast.success("Bem-vindo ao Anotô! 🎉");
      
      // Force a full page reload to refresh auth context with new store_id
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("Error finishing onboarding:", error);
      toast.error(error.message || "Erro ao finalizar");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await handleFinish();
  };

  // Loading state
  if (authLoading || storeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const currentFeature = features[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <motion.div 
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring" as const, stiffness: 300 }}
          >
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </motion.div>
          <span className="font-semibold">Anotô?</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Pular tour
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-4">
        <div className="flex gap-1.5">
          {features.map((_, idx) => (
            <motion.div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= currentStep ? "bg-primary" : "bg-muted"
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: idx * 0.05 }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {currentStep + 1} de {totalSteps}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
            className="max-w-lg mx-auto space-y-6"
          >
            {/* Icon */}
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <div className={`w-16 h-16 rounded-2xl ${currentFeature.color} flex items-center justify-center shadow-lg`}>
                <currentFeature.icon className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* Title & Description */}
            <motion.div 
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h1 className="text-2xl font-bold">{currentFeature.title}</h1>
              <p className="text-muted-foreground">{currentFeature.description}</p>
            </motion.div>

            {/* Animated Mockup */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <currentFeature.MockupComponent />
              </CardContent>
            </Card>

            {/* Highlights */}
            <motion.div 
              className="grid grid-cols-2 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {currentFeature.highlights.map((highlight, idx) => (
                <motion.div
                  key={idx}
                  className="flex items-center gap-2 bg-muted/50 rounded-lg p-3"
                  variants={staggerItem}
                  whileHover={{ scale: 1.02, x: 3 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + idx * 0.1, type: "spring" as const, stiffness: 400 }}
                  >
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  </motion.div>
                  <span className="text-sm">{highlight}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t bg-background">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 0 && (
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button variant="outline" onClick={handlePrevious} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            </motion.div>
          )}
          
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLastStep ? (
              <Button onClick={handleFinish} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    Começar a usar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} className="w-full">
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
