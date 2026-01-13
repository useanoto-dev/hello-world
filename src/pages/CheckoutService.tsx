import { useNavigate, useParams } from "react-router-dom";
import { useCart, ServiceType } from "@/contexts/CartContext";
import { ArrowLeft, Truck, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const serviceOptions = [
  {
    type: "delivery" as ServiceType,
    icon: Truck,
    title: "Delivery",
    description: "Receba em casa ou no trabalho",
  },
  {
    type: "pickup" as ServiceType,
    icon: Store,
    title: "Retirada",
    description: "Retire no estabelecimento",
  },
  {
    type: "dine_in" as ServiceType,
    icon: UtensilsCrossed,
    title: "Comer no Local",
    description: "Consumir no estabelecimento",
  },
];

export default function CheckoutService() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setServiceType, totalPrice, cart, updateIncompleteOrder } = useCart();

  const handleSelectService = (type: ServiceType) => {
    setServiceType(type);
    updateIncompleteOrder({ 
      cart, 
      serviceType: type, 
      totalPrice 
    });
    navigate(`/cardapio/${slug}/finalizar/endereco`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${slug}/carrinho`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Como deseja receber?</h1>
      </header>

      <div className="p-4 space-y-4">
        {serviceOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectService(option.type)}
              className="w-full bg-card border border-border rounded-xl p-6 flex items-center gap-4 hover:border-primary transition-colors text-left"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{option.title}</h3>
                <p className="text-muted-foreground text-sm">{option.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
