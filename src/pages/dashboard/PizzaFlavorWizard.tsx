// Pizza Flavor Wizard Page - Using pizza_flavors table
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PIZZA_FLAVOR_STEPS = [
  { id: 1, label: "Sabor" },
  { id: 2, label: "Preços" },
  { id: 3, label: "Disponibilidade" },
];

const FLAVOR_TYPES = [
  { value: "salgada", label: "🍕 Salgada", description: "Pizzas tradicionais salgadas" },
  { value: "doce", label: "🍫 Doce", description: "Pizzas doces para sobremesa" },
  { value: "especial", label: "⭐ Especial", description: "Sabores gourmet e premium" },
];

interface Category {
  id: string;
  name: string;
  category_type: string | null;
}

interface PizzaSizePrice {
  sizeId: string;
  sizeName: string;
  enabled: boolean;
  price: string;
  surcharge: string;
}

export default function PizzaFlavorWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state - Step 1 (Sabor)
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || "");
  const [flavorName, setFlavorName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [flavorType, setFlavorType] = useState<"salgada" | "doce" | "especial">("salgada");
  const [isPremium, setIsPremium] = useState(false);
  
  // Form state - Step 2 (Preços por Tamanho)
  const [sizePrices, setSizePrices] = useState<PizzaSizePrice[]>([]);
  
  // Form state - Step 3 (Disponibilidade)
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadPizzaSizes(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (editId && storeId) {
      loadFlavorForEdit(editId);
    }
  }, [editId, storeId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      // Load pizza categories only
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, category_type")
        .eq("store_id", profile.store_id)
        .eq("category_type", "pizza")
        .order("display_order");

      setCategories((cats as Category[]) || []);

      // Auto-select first category or from URL
      if (categoryId) {
        setSelectedCategoryId(categoryId);
      } else if (cats && cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadPizzaSizes = async (catId: string) => {
    try {
      // Load pizza sizes for this category from the new table
      const { data: sizes } = await supabase
        .from("pizza_sizes")
        .select("id, name, base_price")
        .eq("category_id", catId)
        .eq("is_active", true)
        .order("display_order");

      if (sizes && sizes.length > 0) {
        setSizePrices(sizes.map(size => ({
          sizeId: size.id,
          sizeName: size.name,
          enabled: true,
          price: size.base_price?.toString() || "0",
          surcharge: "0",
        })));
      } else {
        setSizePrices([]);
        toast.info("Configure os tamanhos na categoria antes de adicionar sabores");
      }
    } catch (error) {
      console.error("Error loading pizza sizes:", error);
      setSizePrices([]);
    }
  };

  const loadFlavorForEdit = async (flavorId: string) => {
    try {
      // Load flavor data
      const { data: flavor } = await supabase
        .from("pizza_flavors")
        .select("*")
        .eq("id", flavorId)
        .single();

      if (flavor) {
        setSelectedCategoryId(flavor.category_id);
        setFlavorName(flavor.name);
        setDescription(flavor.description || "");
        setImageUrl(flavor.image_url);
        setFlavorType(flavor.flavor_type as any || "salgada");
        setIsPremium(flavor.is_premium || false);
        setIsActive(flavor.is_active);

        // Load prices for this flavor
        const { data: prices } = await supabase
          .from("pizza_flavor_prices")
          .select("*")
          .eq("flavor_id", flavorId);

        if (prices && prices.length > 0) {
          setSizePrices(prev => prev.map(sp => {
            const existingPrice = prices.find(p => p.size_id === sp.sizeId);
            if (existingPrice) {
              return {
                ...sp,
                enabled: existingPrice.is_available,
                price: existingPrice.price?.toString() || "0",
                surcharge: existingPrice.surcharge?.toString() || "0",
              };
            }
            return sp;
          }));
        }
      }
    } catch (error) {
      console.error("Error loading flavor for edit:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 1MB");
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const updateSizePrice = (sizeId: string, field: "enabled" | "price" | "surcharge", value: any) => {
    setSizePrices(prev => prev.map(s => 
      s.sizeId === sizeId ? { ...s, [field]: value } : s
    ));
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue || "0", 10) / 100;
    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handlePriceChange = (sizeId: string, field: "price" | "surcharge", inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, "");
    updateSizePrice(sizeId, field, numericValue);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!flavorName.trim()) {
        toast.error("Nome do sabor é obrigatório");
        return;
      }
      if (!selectedCategoryId) {
        toast.error("Selecione uma categoria");
        return;
      }
    }
    if (currentStep === 2) {
      const enabledSizes = sizePrices.filter(s => s.enabled);
      if (enabledSizes.length === 0) {
        toast.error("Ative pelo menos um tamanho");
        return;
      }
    }
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!storeId || !selectedCategoryId || !flavorName.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;

      // Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;
      }

      let flavorId: string;

      if (editId) {
        // Update existing flavor
        const { error } = await supabase
          .from("pizza_flavors")
          .update({
            name: flavorName,
            description: description || null,
            image_url: finalImageUrl,
            flavor_type: flavorType,
            is_premium: isPremium,
            is_active: isActive,
          })
          .eq("id", editId);

        if (error) throw error;
        flavorId = editId;

        // Delete existing prices
        await supabase
          .from("pizza_flavor_prices")
          .delete()
          .eq("flavor_id", editId);
      } else {
        // Create new flavor
        const { data, error } = await supabase
          .from("pizza_flavors")
          .insert({
            store_id: storeId,
            category_id: selectedCategoryId,
            name: flavorName,
            description: description || null,
            image_url: finalImageUrl,
            flavor_type: flavorType,
            is_premium: isPremium,
            is_active: isActive,
          })
          .select("id")
          .single();

        if (error) throw error;
        flavorId = data.id;
      }

      // Insert flavor prices
      const enabledSizes = sizePrices.filter(s => s.enabled);
      if (enabledSizes.length > 0) {
        const priceRecords = enabledSizes.map(sp => ({
          flavor_id: flavorId,
          size_id: sp.sizeId,
          price: parseInt(sp.price || "0") / 100,
          surcharge: parseInt(sp.surcharge || "0") / 100,
          is_available: true,
        }));

        const { error: pricesError } = await supabase
          .from("pizza_flavor_prices")
          .insert(priceRecords);

        if (pricesError) throw pricesError;
      }

      toast.success(editId ? "Sabor atualizado!" : "Sabor criado com sucesso!");
      navigate("/dashboard/products");
    } catch (error: any) {
      console.error("Error saving flavor:", error);
      toast.error(error.message || "Erro ao salvar sabor");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => navigate("/dashboard/products");

  return (
    <div className="min-h-screen bg-[#ebebeb] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e1e1e1] px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClose}
            className="text-[#9d9d9d] hover:text-[#5a5a5a]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-[#2b2b2b]">
              {editId ? "Editar Sabor" : "Novo Sabor de Pizza"}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex">
        {/* Sidebar Steps */}
        <div className="w-56 bg-white border-r border-[#e1e1e1] p-4">
          <div className="space-y-1">
            {PIZZA_FLAVOR_STEPS.map((step) => {
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              const isDisabled = step.id > currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (step.id <= currentStep) {
                      setCurrentStep(step.id);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                    isCurrent
                      ? "bg-blue-50 text-[#009aff] border border-[#009aff]"
                      : isCompleted
                        ? "text-[#2b2b2b] hover:bg-gray-50 cursor-pointer"
                        : "text-[#9d9d9d] cursor-not-allowed"
                  )}
                >
                  <span>{step.id}.</span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-[#e1e1e1] p-6">
              {/* Step 1 - Sabor */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">1. Informações do Sabor</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina nome, descrição e tipo do sabor
                    </p>
                  </div>

                  <div className="flex gap-8">
                    {/* Left Column - Form Fields */}
                    <div className="flex-1 space-y-5">
                      {/* Categoria */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#2b2b2b]">
                          Categoria <span className="text-red-500">*</span>
                        </Label>
                        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                          <SelectTrigger className="h-10 border-[#e1e1e1] bg-white">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-[#e1e1e1]">
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nome do sabor */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#2b2b2b]">
                          Nome do sabor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={flavorName}
                          onChange={(e) => setFlavorName(e.target.value)}
                          placeholder="Ex.: Calabresa, 4 Queijos, Frango com Catupiry etc."
                          className="h-10 border-[#e1e1e1] bg-white text-[#2b2b2b] placeholder:text-[#9d9d9d]"
                          maxLength={100}
                        />
                        <span className="text-xs text-[#9d9d9d]">{flavorName.length}/100</span>
                      </div>

                      {/* Descrição */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#2b2b2b]">Descrição (ingredientes)</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Ex.: Molho, mussarela, calabresa, cebola, orégano e azeite."
                          className="min-h-[80px] border-[#e1e1e1] bg-white text-[#2b2b2b] placeholder:text-[#9d9d9d] resize-none"
                          maxLength={500}
                        />
                        <span className="text-xs text-[#9d9d9d]">{description.length}/500</span>
                      </div>

                      {/* Tipo do Sabor */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-[#2b2b2b]">Tipo de Sabor</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {FLAVOR_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setFlavorType(type.value as any)}
                              className={cn(
                                "p-3 rounded-lg border-2 text-left transition-all",
                                flavorType === type.value
                                  ? "border-[#009aff] bg-blue-50"
                                  : "border-[#e1e1e1] hover:border-[#009aff]/50"
                              )}
                            >
                              <div className="text-lg mb-1">{type.label}</div>
                              <div className="text-xs text-[#9d9d9d]">{type.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sabor Premium */}
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <Switch
                          checked={isPremium}
                          onCheckedChange={setIsPremium}
                          className="data-[state=checked]:bg-amber-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-[#2b2b2b]">Sabor Premium</span>
                          </div>
                          <p className="text-xs text-[#9d9d9d] mt-0.5">
                            Sabores premium podem ter um acréscimo no preço
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Image Upload */}
                    <div className="w-64 space-y-2">
                      <Label className="text-sm font-medium text-[#2b2b2b]">Foto do sabor (opcional)</Label>
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#5bbcfc] rounded-lg bg-white cursor-pointer hover:bg-blue-50/30 transition-colors">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        {imageUrl ? (
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="flex flex-col items-center text-center p-4">
                            <span className="text-4xl mb-2">🍕</span>
                            <span className="text-sm font-medium text-[#2b2b2b]">Escolha a foto</span>
                            <span className="text-xs text-[#9d9d9d] mt-1">Opcional</span>
                          </div>
                        )}
                      </label>
                      <div className="text-xs text-[#9d9d9d] space-y-0.5">
                        <p>Formatos: .png, .jpg, .jpeg, .webp</p>
                        <p>Peso máximo: 1mb</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 - Preços por Tamanho */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">2. Preços por Tamanho</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina o preço deste sabor em cada tamanho de pizza
                    </p>
                  </div>

                  {sizePrices.length === 0 ? (
                    <div className="text-center py-12 bg-[#f5f5f5] rounded-lg">
                      <div className="text-4xl mb-3">⚠️</div>
                      <p className="text-[#5a5a5a] font-medium">Nenhum tamanho cadastrado</p>
                      <p className="text-sm text-[#9d9d9d] mt-1">
                        Configure os tamanhos na categoria primeiro
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate(`/dashboard/category?edit=${selectedCategoryId}`)}
                      >
                        Ir para Categoria
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sizePrices.map((sp) => (
                        <div 
                          key={sp.sizeId} 
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                            sp.enabled 
                              ? "bg-white border-[#e1e1e1]" 
                              : "bg-[#f9f9f9] border-[#e1e1e1]"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <Checkbox
                              checked={sp.enabled}
                              onCheckedChange={(checked) => updateSizePrice(sp.sizeId, "enabled", !!checked)}
                              className="data-[state=checked]:bg-[#009aff] data-[state=checked]:border-[#009aff]"
                            />
                            <span className={cn(
                              "text-sm font-medium",
                              sp.enabled ? "text-[#2b2b2b]" : "text-[#9d9d9d]"
                            )}>
                              {sp.sizeName}
                            </span>
                          </div>

                          {/* Preço */}
                          <div className="space-y-1">
                            <Label className="text-xs text-[#9d9d9d]">Preço</Label>
                            <div className="flex items-center h-10 border border-[#e1e1e1] rounded-md bg-white overflow-hidden">
                              <input
                                type="text"
                                value={formatCurrency(sp.price)}
                                onChange={(e) => handlePriceChange(sp.sizeId, "price", e.target.value)}
                                disabled={!sp.enabled}
                                placeholder="R$ 0,00"
                                className="w-28 px-3 text-sm h-full bg-transparent outline-none disabled:bg-[#f5f5f5] disabled:text-[#9d9d9d]"
                              />
                              <div className="h-full w-10 flex items-center justify-center border-l border-[#e1e1e1] bg-[#f5f5f5]">
                                <DollarSign className="w-4 h-4 text-[#5a5a5a]" />
                              </div>
                            </div>
                          </div>

                          {/* Acréscimo (para premium) */}
                          {isPremium && (
                            <div className="space-y-1">
                              <Label className="text-xs text-amber-600">Acréscimo Premium</Label>
                              <div className="flex items-center h-10 border border-amber-200 rounded-md bg-amber-50 overflow-hidden">
                                <input
                                  type="text"
                                  value={formatCurrency(sp.surcharge)}
                                  onChange={(e) => handlePriceChange(sp.sizeId, "surcharge", e.target.value)}
                                  disabled={!sp.enabled}
                                  placeholder="R$ 0,00"
                                  className="w-28 px-3 text-sm h-full bg-transparent outline-none disabled:bg-[#f5f5f5] disabled:text-[#9d9d9d]"
                                />
                                <div className="h-full w-10 flex items-center justify-center border-l border-amber-200 bg-amber-100">
                                  <Star className="w-4 h-4 text-amber-600" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isPremium && sizePrices.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <Star className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Acréscimo Premium</p>
                          <p className="text-xs text-amber-700 mt-1">
                            O acréscimo é adicionado quando o cliente escolhe este sabor junto com outros sabores normais.
                            Por exemplo: se o cliente pedir meia Calabresa (normal) e meia Camarão (premium), 
                            o acréscimo do Camarão será somado ao valor final.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 - Disponibilidade */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">3. Disponibilidade</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina se este sabor está disponível no cardápio
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label 
                      className={cn(
                        "flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-colors",
                        isActive ? "border-[#009aff] bg-blue-50" : "border-[#e1e1e1]"
                      )}
                      onClick={() => setIsActive(true)}
                    >
                      <div 
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                          isActive ? "border-[#009aff] bg-[#009aff]" : "border-[#9d9d9d]"
                        )}
                      >
                        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-[#2b2b2b]">✅ Disponível</p>
                        <p className="text-xs text-[#9d9d9d]">
                          O sabor aparecerá no cardápio para os clientes
                        </p>
                      </div>
                    </label>

                    <label 
                      className={cn(
                        "flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-colors",
                        !isActive ? "border-[#f15c3b] bg-red-50" : "border-[#e1e1e1]"
                      )}
                      onClick={() => setIsActive(false)}
                    >
                      <div 
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                          !isActive ? "border-[#f15c3b] bg-[#f15c3b]" : "border-[#9d9d9d]"
                        )}
                      >
                        {!isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-[#f15c3b]">⏸️ Pausado / Esgotado</p>
                        <p className="text-xs text-[#9d9d9d]">
                          O sabor não aparecerá no cardápio
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-[#f5f5f5] rounded-lg border border-[#e1e1e1]">
                    <h3 className="font-medium text-[#2b2b2b] mb-3">Resumo do Sabor</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Nome:</span>
                        <span className="font-medium text-[#2b2b2b]">{flavorName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Tipo:</span>
                        <span className="font-medium text-[#2b2b2b]">
                          {FLAVOR_TYPES.find(t => t.value === flavorType)?.label || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Premium:</span>
                        <span className={cn("font-medium", isPremium ? "text-amber-600" : "text-[#2b2b2b]")}>
                          {isPremium ? "Sim ⭐" : "Não"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Tamanhos ativos:</span>
                        <span className="font-medium text-[#2b2b2b]">
                          {sizePrices.filter(s => s.enabled).length} de {sizePrices.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e1e1e1] px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : handleClose()}
            className="px-6 border-[#e1e1e1] text-[#5a5a5a]"
          >
            {currentStep > 1 ? "Voltar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
            className="px-8 bg-[#009aff] hover:bg-[#0071bb] text-white"
          >
            {currentStep === 3 ? (loading ? "Salvando..." : "Salvar Sabor") : "Avançar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
