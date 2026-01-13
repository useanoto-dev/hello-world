import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useStoreStatus } from "@/contexts/StoreStatusContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Clock, AlertCircle, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_name: string | null;
}

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, totalPrice, clearCart, addToCart } = useCart();
  const { isOpen: isStoreOpen, nextOpeningTime } = useStoreStatus();

  // Fetch store for min_order_value and id
  const { data: store } = useQuery({
    queryKey: ["store-cart", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, min_order_value")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch suggested products (cheap items not in cart)
  const { data: suggestedProducts } = useQuery({
    queryKey: ["suggested-products", store?.id, cart.map(i => i.name)],
    queryFn: async () => {
      const cartItemNames = cart.map(item => item.name.toLowerCase());
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          image_url,
          categories!inner(name)
        `)
        .eq("store_id", store!.id)
        .eq("is_available", true)
        .order("price", { ascending: true })
        .limit(20);
      
      if (error) throw error;
      
      // Filter out items already in cart (by name) and return top 6
      const filtered = (data || [])
        .filter(p => !cartItemNames.includes(p.name.toLowerCase()))
        .slice(0, 6)
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url,
          category_name: (p.categories as any)?.name || null,
        }));
      
      return filtered as SuggestedProduct[];
    },
    enabled: !!store?.id && cart.length > 0,
  });

  const minOrderValue = store?.min_order_value || 0;
  const isMinOrderMet = totalPrice >= minOrderValue;
  const amountMissing = Math.max(0, minOrderValue - totalPrice);
  const progressPercent = minOrderValue > 0 ? Math.min(100, (totalPrice / minOrderValue) * 100) : 100;

  // Filter suggestions to show items that would help meet minimum
  const relevantSuggestions = useMemo(() => {
    if (!suggestedProducts || isMinOrderMet) return suggestedProducts || [];
    // Prioritize items that help meet the minimum order value
    return suggestedProducts.filter(p => p.price <= amountMissing * 1.5).slice(0, 4);
  }, [suggestedProducts, isMinOrderMet, amountMissing]);

  const handleQuickAdd = (product: SuggestedProduct) => {
    addToCart({
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category_name || "",
      image_url: product.image_url || undefined,
    });
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${slug}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Seu Carrinho</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Seu carrinho está vazio
          </h2>
          <p className="text-muted-foreground mb-6">
            Que tal adicionar algo delicioso?
          </p>
          <Button onClick={() => navigate(`/cardapio/${slug}`)}>
            Ver Cardápio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${slug}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Seu Carrinho</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
          Limpar
        </Button>
      </header>

      <div className="p-4 space-y-4">
        {/* Progress Bar for Minimum Order */}
        {minOrderValue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              isMinOrderMet 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-warning/10 border-warning/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isMinOrderMet ? (
                  <Sparkles className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {isMinOrderMet ? "Pedido mínimo atingido!" : "Pedido mínimo"}
                </span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(totalPrice)} / {formatCurrency(minOrderValue)}
              </span>
            </div>
            
            <Progress 
              value={progressPercent} 
              className={`h-2 ${isMinOrderMet ? "[&>div]:bg-green-500" : "[&>div]:bg-warning"}`}
            />
            
            {!isMinOrderMet && (
              <p className="text-xs text-muted-foreground mt-2">
                Adicione mais {formatCurrency(amountMissing)} para finalizar seu pedido
              </p>
            )}
          </motion.div>
        )}

        {/* Cart Items */}
        {cart.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <div className="flex gap-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                
                {/* Item details */}
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {item.category === "pizzas" && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {item.size && <p>Tamanho: {item.size}</p>}
                    {item.flavors && item.flavors.length > 0 && (
                      <p>Sabor: {item.flavors.map(f => f.name).join(" / ")}</p>
                    )}
                    {item.extras?.border && <p>Borda: {item.extras.border.name}</p>}
                    {item.extras?.toppings && item.extras.toppings.length > 0 && (
                      <p>Coberturas: {item.extras.toppings.map(t => t.name).join(", ")}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-medium w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Suggested Products */}
        <AnimatePresence>
          {!isMinOrderMet && relevantSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Que tal adicionar?</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/cardapio/${slug}`)}
                  className="text-xs text-primary h-7 px-2"
                >
                  Ver tudo
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {relevantSuggestions.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border border-border rounded-xl p-3 flex flex-col"
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-20 rounded-lg object-cover mb-2"
                      />
                    )}
                    <p className="font-medium text-foreground text-sm line-clamp-2 flex-1">
                      {product.name}
                    </p>
                    {product.category_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.category_name}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary text-sm">
                        {formatCurrency(product.price)}
                      </span>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleQuickAdd(product)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with total and checkout */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-bottom">
        {!isStoreOpen && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 mb-3 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Estabelecimento fechado. {nextOpeningTime || "Não é possível finalizar pedidos."}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="text-xl font-bold text-foreground">{formatCurrency(totalPrice)}</span>
        </div>
        {isStoreOpen ? (
          isMinOrderMet ? (
            <Link to={`/cardapio/${slug}/finalizar`}>
              <Button className="w-full" size="lg">
                Continuar para Pagamento
              </Button>
            </Link>
          ) : (
            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => navigate(`/cardapio/${slug}`)}
              variant="secondary"
            >
              Adicionar mais itens ({formatCurrency(amountMissing)})
            </Button>
          )
        ) : (
          <Button className="w-full" size="lg" disabled>
            Estabelecimento Fechado
          </Button>
        )}
      </div>
    </div>
  );
}