// ExplorePage - Explorar Cardápios por CEP (estilo iFood)
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Star, ArrowLeft, Store, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

// Cores fixas (não usa CSS variables)
const COLORS = {
  background: "#F8F9FA",
  backgroundAlt: "#FFFFFF",
  foreground: "#1A1A1A",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  primaryLight: "#FFF8E1",
  muted: "#F5F5F5",
  mutedForeground: "#6B7280",
  border: "rgba(0, 0, 0, 0.06)",
  card: "#FFFFFF",
};

interface StoreWithRating {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  slug: string;
  avg_rating: number;
  review_count: number;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [stores, setStores] = useState<StoreWithRating[]>([]);
  const [topRatedStores, setTopRatedStores] = useState<StoreWithRating[]>([]);
  const [cepError, setCepError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Buscar top rated stores ao carregar
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
          .slice(0, 10);

        if (sortedStores.length === 0) return;

        const storeIds = sortedStores.map(s => s.storeId);
        const { data: storesData, error: storeError } = await supabase
          .from("stores")
          .select("id, name, logo_url, address, slug")
          .in("id", storeIds)
          .eq("is_active", true);

        if (storeError) throw storeError;
        if (!storesData || storesData.length === 0) return;

        const topStores = sortedStores
          .map(s => {
            const store = storesData.find(st => st.id === s.storeId);
            if (!store) return null;
            return { ...store, avg_rating: Math.round(s.avg * 10) / 10, review_count: s.count };
          })
          .filter(Boolean) as StoreWithRating[];

        setTopRatedStores(topStores);
      } catch (error) {
        console.error("Error fetching top rated stores:", error);
      }
    };
    fetchTopRatedStores();
  }, []);

  // Formatar CEP
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Buscar endereço pelo CEP
  const fetchAddressFromCep = useCallback(async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    setCepError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setCepError("CEP não encontrado");
        setCity("");
        setState("");
        return;
      }
      
      setCity(data.localidade || "");
      setState(data.uf || "");
    } catch (error) {
      setCepError("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  }, []);

  // Handler do CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    setCepError("");
    
    if (formatted.replace(/\D/g, "").length === 8) {
      fetchAddressFromCep(formatted);
    } else {
      setCity("");
      setState("");
    }
  };

  // Buscar lojas por cidade
  const searchStoresByCity = async () => {
    if (!city) return;
    
    setIsLoadingStores(true);
    setHasSearched(true);
    try {
      // Buscar todas as lojas que tenham a cidade no endereço
      const { data: storesData, error } = await supabase
        .from("stores")
        .select("id, name, logo_url, address, slug")
        .eq("is_active", true)
        .ilike("address", `%${city}%`);

      if (error) throw error;
      
      if (!storesData || storesData.length === 0) {
        setStores([]);
        return;
      }

      // Buscar ratings
      const storeIds = storesData.map(s => s.id);
      const { data: reviews } = await supabase
        .from("reviews")
        .select("store_id, rating")
        .in("store_id", storeIds);

      const storeRatings: Record<string, { total: number; count: number }> = {};
      reviews?.forEach(review => {
        if (!storeRatings[review.store_id]) {
          storeRatings[review.store_id] = { total: 0, count: 0 };
        }
        storeRatings[review.store_id].total += review.rating;
        storeRatings[review.store_id].count += 1;
      });

      const storesWithRating = storesData.map(store => {
        const rating = storeRatings[store.id];
        return {
          ...store,
          avg_rating: rating ? Math.round((rating.total / rating.count) * 10) / 10 : 0,
          review_count: rating?.count || 0
        };
      }).sort((a, b) => b.avg_rating - a.avg_rating);

      setStores(storesWithRating);
    } catch (error) {
      console.error("Error searching stores:", error);
    } finally {
      setIsLoadingStores(false);
    }
  };

  // StoreCard Component
  const StoreCard = ({ store }: { store: StoreWithRating }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/cardapio/${store.slug}`)}
      className="cursor-pointer rounded-2xl overflow-hidden"
      style={{
        backgroundColor: COLORS.card,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
        border: `1px solid ${COLORS.border}`
      }}
    >
      <div className="p-4 flex items-center gap-4">
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ backgroundColor: COLORS.primaryLight }}
        >
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-8 h-8" style={{ color: COLORS.primaryDark }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate" style={{ color: COLORS.foreground }}>
            {store.name}
          </h3>
          {store.address && (
            <p className="text-sm truncate mt-0.5" style={{ color: COLORS.mutedForeground }}>
              <MapPin className="w-3 h-3 inline mr-1" />
              {store.address}
            </p>
          )}
          {store.review_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium" style={{ color: COLORS.foreground }}>
                {store.avg_rating}
              </span>
              <span className="text-sm" style={{ color: COLORS.mutedForeground }}>
                ({store.review_count})
              </span>
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.mutedForeground }} />
      </div>
    </motion.div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.background }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50 px-4 py-3"
        style={{ 
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${COLORS.border}`
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full transition-colors hover:bg-gray-100"
            style={{ background: "none", border: "none" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.foreground }} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: COLORS.foreground }}>
            Explorar Cardápios
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Search by CEP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={{
            backgroundColor: COLORS.card,
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
            border: `1px solid ${COLORS.border}`
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: COLORS.foreground }}>
            <MapPin className="w-5 h-5 inline mr-2" style={{ color: COLORS.primaryDark }} />
            Buscar por CEP
          </h2>
          
          <div className="space-y-4">
            <div className="relative">
              <Input
                value={cep}
                onChange={handleCepChange}
                placeholder="Digite seu CEP"
                maxLength={9}
                className="text-lg h-12 pr-10"
                style={{ 
                  backgroundColor: COLORS.muted,
                  border: cepError ? "1px solid #EF4444" : `1px solid ${COLORS.border}`,
                  borderRadius: "12px"
                }}
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" style={{ color: COLORS.mutedForeground }} />
              )}
            </div>
            
            {cepError && (
              <p className="text-sm text-red-500">{cepError}</p>
            )}
            
            <AnimatePresence>
              {city && state && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: COLORS.primaryLight }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: COLORS.primaryDark }} />
                    <span className="font-medium" style={{ color: COLORS.foreground }}>
                      {city}, {state}
                    </span>
                  </div>
                  <Button
                    onClick={searchStoresByCity}
                    disabled={isLoadingStores}
                    className="rounded-full"
                    style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
                  >
                    {isLoadingStores ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Buscar
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: COLORS.foreground }}>
                {stores.length > 0 ? (
                  <>Cardápios em {city}</>
                ) : (
                  <>Nenhum cardápio encontrado em {city}</>
                )}
              </h2>
              
              {stores.length > 0 ? (
                <div className="space-y-3">
                  {stores.map((store) => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              ) : (
                <div 
                  className="text-center py-12 rounded-2xl"
                  style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  <Store className="w-12 h-12 mx-auto mb-3" style={{ color: COLORS.mutedForeground }} />
                  <p style={{ color: COLORS.mutedForeground }}>
                    Ainda não temos cardápios cadastrados nesta cidade.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Rated Section */}
        {!hasSearched && topRatedStores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.foreground }}>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              Mais bem avaliados
            </h2>
            
            <div className="space-y-3">
              {topRatedStores.map((store, index) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <StoreCard store={store} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
