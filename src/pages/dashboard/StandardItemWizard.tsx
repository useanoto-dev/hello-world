// Standard Item Wizard - For hamburgers, açaí, dishes, etc.
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const ITEM_STEPS = [
  { id: 1, label: "Item" },
  { id: 2, label: "Preços" },
  { id: 3, label: "Disponibilidade" },
];

const ITEM_TYPES = [
  { value: "tradicional", label: "🍔 Tradicional", description: "Itens clássicos do cardápio" },
  { value: "especial", label: "⭐ Especial", description: "Itens gourmet e premium" },
  { value: "promocional", label: "🏷️ Promoção", description: "Ofertas e combos" },
];

interface Category {
  id: string;
  name: string;
  category_type: string | null;
}

interface SizePrice {
  sizeId: string;
  sizeName: string;
  enabled: boolean;
  price: string;
}

export default function StandardItemWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const editId = searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state - Step 1 (Item)
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || "");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [itemType, setItemType] = useState<"tradicional" | "especial" | "promocional">("tradicional");
  const [isPremium, setIsPremium] = useState(false);
  
  // Form state - Step 2 (Preços por Tamanho)
  const [sizePrices, setSizePrices] = useState<SizePrice[]>([]);
  
  // Form state - Step 3 (Disponibilidade)
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSizes(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (editId && storeId) {
      loadItemForEdit(editId);
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

      // Load standard categories only (not pizza)
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, category_type")
        .eq("store_id", profile.store_id)
        .neq("category_type", "pizza")
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

  const loadSizes = async (catId: string) => {
    try {
      const { data: sizes } = await supabase
        .from("standard_sizes")
        .select("id, name, base_price")
        .eq("category_id", catId)
        .eq("is_active", true)
        .order("display_order");

      if (sizes && sizes.length > 0) {
        setSizePrices(sizes.map(size => ({
          sizeId: size.id,
          sizeName: size.name,
          enabled: true,
          price: ((size.base_price || 0) * 100).toString(),
        })));
      } else {
        setSizePrices([]);
        toast.info("Configure os tamanhos na categoria antes de adicionar itens");
      }
    } catch (error) {
      console.error("Error loading sizes:", error);
      setSizePrices([]);
    }
  };

  const loadItemForEdit = async (itemId: string) => {
    try {
      const { data: item } = await supabase
        .from("standard_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (item) {
        setSelectedCategoryId(item.category_id);
        setItemName(item.name);
        setDescription(item.description || "");
        setImageUrl(item.image_url);
        setItemType(item.item_type as any || "tradicional");
        setIsPremium(item.is_premium || false);
        setIsActive(item.is_active);

        // Load prices for this item
        const { data: prices } = await supabase
          .from("standard_item_prices")
          .select("*")
          .eq("item_id", itemId);

        if (prices && prices.length > 0) {
          setSizePrices(prev => prev.map(sp => {
            const existingPrice = prices.find(p => p.size_id === sp.sizeId);
            if (existingPrice) {
              return {
                ...sp,
                enabled: existingPrice.is_available,
                price: ((existingPrice.price || 0) * 100).toString(),
              };
            }
            return sp;
          }));
        }
      }
    } catch (error) {
      console.error("Error loading item for edit:", error);
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

  const updateSizePrice = (sizeId: string, field: "enabled" | "price", value: any) => {
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

  const handlePriceChange = (sizeId: string, inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, "");
    updateSizePrice(sizeId, "price", numericValue);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!itemName.trim()) {
        toast.error("Nome do item é obrigatório");
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
    if (!storeId || !selectedCategoryId || !itemName.trim()) {
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

      let itemId: string;

      if (editId) {
        // Update existing item
        const { error } = await supabase
          .from("standard_items")
          .update({
            name: itemName,
            description: description || null,
            image_url: finalImageUrl,
            item_type: itemType,
            is_premium: isPremium,
            is_active: isActive,
          })
          .eq("id", editId);

        if (error) throw error;
        itemId = editId;

        // Delete existing prices
        await supabase
          .from("standard_item_prices")
          .delete()
          .eq("item_id", editId);
      } else {
        // Create new item
        const { data, error } = await supabase
          .from("standard_items")
          .insert({
            store_id: storeId,
            category_id: selectedCategoryId,
            name: itemName,
            description: description || null,
            image_url: finalImageUrl,
            item_type: itemType,
            is_premium: isPremium,
            is_active: isActive,
          })
          .select("id")
          .single();

        if (error) throw error;
        itemId = data.id;
      }

      // Insert item prices
      const enabledSizes = sizePrices.filter(s => s.enabled);
      if (enabledSizes.length > 0) {
        const priceRecords = enabledSizes.map(sp => ({
          item_id: itemId,
          size_id: sp.sizeId,
          price: parseInt(sp.price || "0") / 100,
          is_available: true,
        }));

        const { error: pricesError } = await supabase
          .from("standard_item_prices")
          .insert(priceRecords);

        if (pricesError) throw pricesError;
      }

      toast.success(editId ? "Item atualizado!" : "Item criado com sucesso!");
      navigate("/dashboard/products");
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.message || "Erro ao salvar item");
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
              {editId ? "Editar Item" : "Novo Item"}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex">
        {/* Sidebar Steps */}
        <div className="w-56 bg-white border-r border-[#e1e1e1] p-4">
          <div className="space-y-1">
            {ITEM_STEPS.map((step) => {
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
              {/* Step 1 - Item */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">1. Informações do Item</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina nome, descrição e tipo do item
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

                      {/* Nome do item */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#2b2b2b]">
                          Nome do item <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="Ex.: X-Burguer, Açaí 500ml, Prato Executivo etc."
                          className="h-10 border-[#e1e1e1] bg-white text-[#2b2b2b] placeholder:text-[#9d9d9d]"
                          maxLength={100}
                        />
                        <span className="text-xs text-[#9d9d9d]">{itemName.length}/100</span>
                      </div>

                      {/* Descrição */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#2b2b2b]">Descrição</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Ex.: Pão, hambúrguer 180g, queijo, alface, tomate e molho especial."
                          className="min-h-[80px] border-[#e1e1e1] bg-white text-[#2b2b2b] placeholder:text-[#9d9d9d] resize-none"
                          maxLength={500}
                        />
                        <span className="text-xs text-[#9d9d9d]">{description.length}/500</span>
                      </div>

                      {/* Tipo do Item */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-[#2b2b2b]">Tipo de Item</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {ITEM_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setItemType(type.value as any)}
                              className={cn(
                                "p-3 rounded-lg border-2 text-left transition-all",
                                itemType === type.value
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

                      {/* Item Premium */}
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <Switch
                          checked={isPremium}
                          onCheckedChange={setIsPremium}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium text-[#2b2b2b]">Item Premium</span>
                          </div>
                          <p className="text-xs text-[#9d9d9d]">
                            Destaque este item como especial
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Image */}
                    <div className="w-48 flex-shrink-0">
                      <Label className="text-sm font-medium text-[#2b2b2b] mb-2 block">Imagem</Label>
                      <label className="block cursor-pointer">
                        <div className={cn(
                          "w-48 h-48 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors",
                          imageUrl ? "border-transparent" : "border-[#e1e1e1] hover:border-[#009aff]"
                        )}>
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <div className="text-3xl mb-2">📷</div>
                              <span className="text-sm text-[#9d9d9d]">Adicionar foto</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                      {imageUrl && (
                        <button 
                          onClick={() => { setImageUrl(null); setImageFile(null); }}
                          className="mt-2 text-xs text-red-500 hover:underline"
                        >
                          Remover imagem
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 - Prices */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">2. Preços por Tamanho</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina o preço para cada tamanho disponível
                    </p>
                  </div>

                  {sizePrices.length === 0 ? (
                    <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-amber-700">
                        Nenhum tamanho configurado nesta categoria.
                      </p>
                      <p className="text-sm text-amber-600 mt-1">
                        Configure os tamanhos primeiro no editor de categoria.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-3"
                        onClick={() => navigate(`/dashboard/category/edit?edit=${selectedCategoryId}`)}
                      >
                        Configurar tamanhos
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
                              : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <Switch
                            checked={sp.enabled}
                            onCheckedChange={(checked) => updateSizePrice(sp.sizeId, "enabled", checked)}
                          />
                          <span className={cn(
                            "font-medium w-32",
                            sp.enabled ? "text-[#2b2b2b]" : "text-[#9d9d9d]"
                          )}>
                            {sp.sizeName}
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            <DollarSign className="w-4 h-4 text-[#9d9d9d]" />
                            <Input
                              value={formatCurrency(sp.price)}
                              onChange={(e) => handlePriceChange(sp.sizeId, e.target.value)}
                              disabled={!sp.enabled}
                              className={cn(
                                "h-10 w-32 text-right font-mono",
                                !sp.enabled && "opacity-50"
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 - Availability */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">3. Disponibilidade</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Configure se o item está disponível para venda
                    </p>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-lg border border-[#e1e1e1] bg-white">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <div>
                      <span className="font-medium text-[#2b2b2b]">
                        {isActive ? "Disponível" : "Indisponível"}
                      </span>
                      <p className="text-sm text-[#9d9d9d]">
                        {isActive 
                          ? "Este item aparecerá no cardápio" 
                          : "Este item está oculto no cardápio"}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-[#e1e1e1]">
                    <h3 className="font-semibold text-[#2b2b2b] mb-4">Resumo</h3>
                    <div className="flex gap-4">
                      {imageUrl && (
                        <img 
                          src={imageUrl} 
                          alt={itemName}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[#2b2b2b]">{itemName}</p>
                        {description && (
                          <p className="text-sm text-[#9d9d9d] mt-1">{description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            itemType === "tradicional" && "bg-blue-100 text-blue-700",
                            itemType === "especial" && "bg-amber-100 text-amber-700",
                            itemType === "promocional" && "bg-green-100 text-green-700"
                          )}>
                            {ITEM_TYPES.find(t => t.value === itemType)?.label}
                          </span>
                          {isPremium && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Premium
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e1e1e1] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : handleClose()}
          >
            {currentStep > 1 ? "Voltar" : "Cancelar"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
            className="bg-[#009aff] hover:bg-[#0088e6] text-white min-w-32"
          >
            {loading ? "Salvando..." : currentStep === 3 ? "Salvar Item" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
