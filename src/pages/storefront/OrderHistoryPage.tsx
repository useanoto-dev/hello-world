// Order History Page - Anotô SaaS
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History, Search, ShoppingBag, ArrowLeft, 
  ChevronRight, Calendar, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: number;
  items: OrderItem[];
  total: number;
  order_type: string;
  status: string;
  created_at: string;
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

export default function OrderHistoryPage() {
  const { slug } = useParams();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
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
      // First get store ID from slug
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", slug)
        .single();

      if (storeError || !store) {
        toast.error("Loja não encontrada");
        return;
      }

      // Then get orders for this phone (search with raw phone number)
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .or(`customer_phone.eq.${cleanPhone},customer_phone.ilike.%${cleanPhone}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={`/cardapio/${slug}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold">Meus Pedidos</h1>
            <p className="text-xs text-muted-foreground">Histórico de pedidos</p>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
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
            <Input
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </motion.div>

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
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
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
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : null}
      </main>
    </div>
  );
}
