// ExplorePage - Explorar Cardápios por CEP (estilo iFood)
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Star, ArrowLeft, Store, Loader2, ChevronRight, User, X, Phone, FileText, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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

interface CustomerProfile {
  name: string;
  phone: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const PROFILE_STORAGE_KEY = "customer_profile";

const getStoredProfile = (): CustomerProfile => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Sincroniza com campos do checkout (customerName, customerPhone, etc)
      return {
        name: data.name || data.customerName || "",
        phone: data.phone || data.customerPhone || "",
        cpf: data.cpf || data.customerCpf || "",
        cep: data.cep || "",
        street: data.street || "",
        number: data.number || "",
        complement: data.complement || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || "",
      };
    }
  } catch {}
  return {
    name: "",
    phone: "",
    cpf: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  };
};

const saveProfile = (profile: CustomerProfile) => {
  // Carrega dados existentes para não perder campos do checkout
  let existingData: Record<string, unknown> = {};
  try {
    const existing = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (existing) existingData = JSON.parse(existing);
  } catch {}
  
  const dataToSave = {
    ...existingData,
    // Campos do perfil
    ...profile,
    // Sincroniza com campos do checkout
    customerName: profile.name,
    customerPhone: profile.phone,
    customerCpf: profile.cpf,
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(dataToSave));
};

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
  
  // Profile drawer state
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>(getStoredProfile);
  const [isLoadingProfileCep, setIsLoadingProfileCep] = useState(false);
  const [profileCepError, setProfileCepError] = useState("");

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

  // Formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Formatar CPF
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
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

  // Buscar endereço pelo CEP do perfil
  const fetchProfileAddressFromCep = useCallback(async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsLoadingProfileCep(true);
    setProfileCepError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setProfileCepError("CEP não encontrado");
        return;
      }
      
      setProfile(prev => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch (error) {
      setProfileCepError("Erro ao buscar CEP");
    } finally {
      setIsLoadingProfileCep(false);
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

  // Handler do CEP do perfil
  const handleProfileCepChange = (value: string) => {
    const formatted = formatCep(value);
    setProfile(prev => ({ ...prev, cep: formatted }));
    setProfileCepError("");
    
    if (formatted.replace(/\D/g, "").length === 8) {
      fetchProfileAddressFromCep(formatted);
    }
  };

  // Salvar perfil
  const handleSaveProfile = () => {
    saveProfile(profile);
    toast.success("Perfil salvo com sucesso!");
    setShowProfileDrawer(false);
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
      onClick={() => navigate(`/cardapio/${store.slug}`, { state: { fromExplore: true } })}
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
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          
          {/* Profile Button */}
          <button
            onClick={() => setShowProfileDrawer(true)}
            className="p-2 rounded-full transition-colors hover:bg-amber-50 relative"
            style={{ 
              background: profile.name ? COLORS.primaryLight : "none", 
              border: "none" 
            }}
            title="Meu Perfil"
          >
            <User className="w-5 h-5" style={{ color: profile.name ? COLORS.primaryDark : COLORS.foreground }} />
            {profile.name && (
              <div 
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "#10B981" }}
              />
            )}
          </button>
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

      {/* Profile Drawer */}
      <Drawer open={showProfileDrawer} onOpenChange={setShowProfileDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: COLORS.primaryDark }} />
              Meu Perfil
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4 overflow-y-auto space-y-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2" style={{ color: COLORS.mutedForeground }}>
                <User className="w-4 h-4" />
                Dados Pessoais
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Nome</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Telefone</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">CPF</Label>
                    <Input
                      value={profile.cpf}
                      onChange={(e) => setProfile(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2" style={{ color: COLORS.mutedForeground }}>
                <Home className="w-4 h-4" />
                Endereço
              </h3>
              
              <div className="space-y-3">
                <div className="relative">
                  <Label className="text-sm">CEP</Label>
                  <Input
                    value={profile.cep}
                    onChange={(e) => handleProfileCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className={`mt-1 ${profileCepError ? "border-red-500" : ""}`}
                  />
                  {isLoadingProfileCep && (
                    <Loader2 className="absolute right-3 top-8 w-4 h-4 animate-spin" style={{ color: COLORS.mutedForeground }} />
                  )}
                  {profileCepError && (
                    <p className="text-xs text-red-500 mt-1">{profileCepError}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Cidade</Label>
                    <Input
                      value={profile.city}
                      onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Cidade"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Estado</Label>
                    <Input
                      value={profile.state}
                      onChange={(e) => setProfile(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="UF"
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Rua</Label>
                  <Input
                    value={profile.street}
                    onChange={(e) => setProfile(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Rua, Avenida..."
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Bairro</Label>
                  <Input
                    value={profile.neighborhood}
                    onChange={(e) => setProfile(prev => ({ ...prev, neighborhood: e.target.value }))}
                    placeholder="Bairro"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Número</Label>
                    <Input
                      value={profile.number}
                      onChange={(e) => setProfile(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="Nº"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Complemento</Label>
                    <Input
                      value={profile.complement}
                      onChange={(e) => setProfile(prev => ({ ...prev, complement: e.target.value }))}
                      placeholder="Apto, Bloco..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Save Button */}
            <Button
              onClick={handleSaveProfile}
              className="w-full rounded-full"
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
            >
              <Check className="w-4 h-4 mr-2" />
              Salvar Perfil
            </Button>
            
            <p className="text-xs text-center" style={{ color: COLORS.mutedForeground }}>
              Seus dados são salvos apenas neste dispositivo
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
