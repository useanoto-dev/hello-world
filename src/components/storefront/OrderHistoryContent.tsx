// Order History Content - Inline component for bottom navigation
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History, Search, ShoppingBag, 
  ChevronRight, Calendar, Package, X, RefreshCw, Plus, Star, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useCart, CartItem } from "@/contexts/CartContext";
import { PostOrderReviewModal } from "@/components/storefront/PostOrderReviewModal";
import anotoMascot from "@/assets/anoto-mascot.png";

interface OrderItem {
  id?: string;
  product_id?: string; // ID original do produto para controle de estoque
  name: string;
  quantity: number;
  price: number;
  category?: string;
  description?: string;
  image_url?: string;
  size?: string;
  flavors?: Array<{
    name: string;
    ingredients?: string;
    isPremium?: boolean;
    surcharge?: number;
    price?: number;
  }>;
  extras?: {
    border?: { id: string; name: string; price: number } | null;
    toppings?: Array<{ id: string; name: string; price: number }>;
    specialSurcharges?: string[];
  };
  unit_base_price?: number;
}

interface Order {
  id: string;
  order_number: number;
  items: OrderItem[];
  total: number;
  order_type: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
}

interface LoyaltyInfo {
  pointsEarned: number;
  totalPoints: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  preparing: { label: "Preparando", color: "bg-orange-100 text-orange-800" },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800" },
  delivering: { label: "Em entrega", color: "bg-purple-100 text-purple-800" },
  completed: { label: "Concluído", color: "bg-gray-100 text-gray-800" },
  canceled: { label: "Cancelado", color: "bg-red-100 text-red-800" }
};

interface OrderHistoryContentProps {
  storeId: string;
  storeName?: string;
}

const STORAGE_KEY = "anoto_customer_phone";

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

export default function OrderHistoryContent({ storeId, storeName }: OrderHistoryContentProps) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { clearCart, addToCart, clearIncompleteOrder } = useCart();
  const [phone, setPhone] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? formatPhone(saved) : "";
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Check loyalty points for the customer
  useEffect(() => {
    const checkLoyaltyPoints = async () => {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 10 && orders.length > 0) {
        try {
          const { data: settings } = await supabase
            .from("loyalty_settings")
            .select("is_enabled")
            .eq("store_id", storeId)
            .eq("is_enabled", true)
            .maybeSingle();

          if (!settings) return;

          const { data: pointsData } = await supabase
            .from("customer_points")
            .select("total_points, lifetime_points")
            .eq("store_id", storeId)
            .eq("customer_phone", cleanPhone)
            .maybeSingle();

          if (pointsData) {
            setLoyaltyInfo({
              pointsEarned: pointsData.lifetime_points || 0,
              totalPoints: pointsData.total_points || 0,
            });
          }
        } catch (error) {
          console.error("Error checking loyalty:", error);
        }
      }
    };

    checkLoyaltyPoints();
  }, [orders, phone, storeId]);

  // Check if customer has reviewed
  useEffect(() => {
    const checkReview = async () => {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        const { data } = await supabase
          .from("reviews")
          .select("id")
          .eq("store_id", storeId)
          .eq("customer_phone", cleanPhone)
          .limit(1);
        
        setHasReviewed((data?.length || 0) > 0);
      }
    };

    if (searched) {
      checkReview();
    }
  }, [searched, phone, storeId]);

  const handleReorder = (order: Order, e: React.MouseEvent, replaceCart: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    setReorderingId(order.id);
    
    try {
      // Clear existing cart and incomplete order only if replacing
      if (replaceCart) {
        clearCart();
        clearIncompleteOrder();
      }
      
      // Add each item from the order to the cart
      order.items.forEach((item, index) => {
        const cartItem: CartItem = {
          id: item.id || `reorder_${order.order_number}_${index}_${Date.now()}`,
          product_id: item.product_id, // Preservar ID original para dedução de estoque
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category || "geral",
          description: item.description,
          image_url: item.image_url,
          size: item.size,
          flavors: item.flavors,
          extras: item.extras,
          unit_base_price: item.unit_base_price,
        };
        
        // For items with quantity > 1, we need to add them properly
        for (let i = 0; i < item.quantity; i++) {
          addToCart({
            ...cartItem,
            id: `reorder_${order.order_number}_${index}_${i}_${Date.now()}`,
            quantity: 1,
          });
        }
      });
      
      toast.success(replaceCart ? "Carrinho atualizado!" : "Itens adicionados ao carrinho!");
      
      // Navigate to cart page
      setTimeout(() => {
        navigate(`/cardapio/${slug}/carrinho`);
      }, 300);
      
    } catch (error) {
      console.error("Erro ao repetir pedido:", error);
      toast.error("Erro ao adicionar itens ao carrinho");
    } finally {
      setReorderingId(null);
    }
  };

  const handleSearch = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Digite um telefone válido");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .or(`customer_phone.eq.${cleanPhone},customer_phone.ilike.%${cleanPhone}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Save phone to localStorage on successful search
      localStorage.setItem(STORAGE_KEY, cleanPhone);

      setOrders((data || []).map(o => ({
        ...o,
        items: (o.items as unknown as OrderItem[]) || []
      })));
    } catch (error) {
      console.error("Error searching orders:", error);
      toast.error("Erro ao buscar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (order: Order) => {
    setSelectedOrderForReview(order);
    setShowReviewModal(true);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <History className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Consultar Pedidos</h2>
            <p className="text-sm text-muted-foreground">
              Digite seu telefone para ver seus pedidos anteriores
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {localStorage.getItem(STORAGE_KEY) && phone && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  setPhone("");
                  setOrders([]);
                  setSearched(false);
                  setLoyaltyInfo(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Limpar telefone salvo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>
      </motion.div>

      {/* Loyalty Points Card */}
      {loyaltyInfo && loyaltyInfo.totalPoints > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Programa de Fidelidade</p>
              <p className="text-2xl font-bold text-amber-500">{loyaltyInfo.totalPoints} pontos</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Acumulados em {loyaltyInfo.pointsEarned} pontos ao longo de suas compras
          </p>
        </motion.div>
      )}

      {/* Review Prompt Card - Show if customer has orders but hasn't reviewed */}
      {searched && orders.length > 0 && !hasReviewed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-500 fill-purple-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Avalie sua experiência!</p>
              <p className="text-sm text-muted-foreground">
                Sua opinião é muito importante para melhorarmos
              </p>
            </div>
          </div>
          <Button
            className="w-full mt-3 bg-purple-500 hover:bg-purple-600 text-white gap-2"
            onClick={() => {
              const completedOrder = orders.find(o => o.status === "completed");
              if (completedOrder) {
                handleOpenReview(completedOrder);
              } else if (orders.length > 0) {
                handleOpenReview(orders[0]);
              }
            }}
          >
            <Star className="w-4 h-4" />
            Deixar Avaliação
          </Button>
        </motion.div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : searched && orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          {/* Mascot with wobble animation */}
          <motion.div className="relative mx-auto mb-4 w-28 h-28">
            {/* Subtle glow */}
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Mascot with wobble */}
            <motion.img
              src={anotoMascot}
              alt="Nenhum pedido"
              className="w-28 h-28 object-contain relative z-10 drop-shadow-lg"
              animate={{ 
                rotate: [-10, 10, -10, 10, -10],
                y: [0, -8, 0, -5, 0],
                scale: [1, 1.03, 1, 1.02, 1]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
            {/* Floating emojis */}
            {['📦', '🔍', '📦'].map((emoji, i) => (
              <motion.span
                key={i}
                className="absolute text-lg"
                style={{
                  left: `${15 + i * 30}%`,
                  top: '-5%'
                }}
                animate={{
                  y: [0, -12, 0],
                  opacity: [0.5, 1, 0.5],
                  rotate: [-5, 5, -5]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.25
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
          <h3 className="font-semibold mb-2">Nenhum pedido encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Não encontramos pedidos com esse telefone
          </p>
        </motion.div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            {orders.length} pedido{orders.length > 1 ? "s" : ""} encontrado{orders.length > 1 ? "s" : ""}
          </h3>
          
          <AnimatePresence>
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/cardapio/${slug}/pedido/${order.order_number}`}>
                  <div className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">#{order.order_number}</span>
                          <Badge className={statusConfig[order.status]?.color}>
                            {statusConfig[order.status]?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {order.items.map((item, i) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm">
                        {order.order_type === "delivery" ? "🛵 Delivery" : 
                         order.order_type === "pickup" ? "🏪 Retirada" : "🍽️ Mesa"}
                      </span>
                      <span className="font-bold">R$ {order.total.toFixed(2)}</span>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => handleReorder(order, e, false)}
                        disabled={reorderingId === order.id}
                      >
                        <Plus className={`w-4 h-4 ${reorderingId === order.id ? 'animate-spin' : ''}`} />
                        Adicionar
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => handleReorder(order, e, true)}
                        disabled={reorderingId === order.id}
                      >
                        <RefreshCw className={`w-4 h-4 ${reorderingId === order.id ? 'animate-spin' : ''}`} />
                        Repetir
                      </Button>
                    </div>

                    {/* Review Button for completed orders */}
                    {order.status === "completed" && !hasReviewed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenReview(order);
                        }}
                      >
                        <Star className="w-4 h-4" />
                        Avaliar este pedido
                      </Button>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      {/* Review Modal */}
      {selectedOrderForReview && (
        <PostOrderReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedOrderForReview(null);
          }}
          storeId={storeId}
          storeName={storeName || ""}
          customerName={selectedOrderForReview.customer_name}
          customerPhone={selectedOrderForReview.customer_phone}
          orderNumber={selectedOrderForReview.order_number}
          onReviewSubmitted={() => setHasReviewed(true)}
        />
      )}
    </div>
  );
}
