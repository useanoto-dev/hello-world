// Standard Item Wizard Page - For non-pizza products (drinks, açaí, burgers, etc.)
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, DollarSign, Package, ImagePlus, Loader2, X } from "lucide-react";
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

const STANDARD_ITEM_STEPS = [
  { id: 1, label: "Item" },
  { id: 2, label: "Preço" },
  { id: 3, label: "Disponibilidade" },
];

interface Category {
  id: string;
  name: string;
  category_type: string | null;
}

// Compress image using canvas
async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.85
): Promise<{ blob: Blob; isPng: boolean }> {
  const isPng = file.type === "image/png";
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      if (isPng && ctx) {
        ctx.clearRect(0, 0, width, height);
      }

      ctx?.drawImage(img, 0, 0, width, height);

      const format = isPng ? "image/png" : "image/jpeg";
      const compressionQuality = isPng ? undefined : quality;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, isPng });
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        format,
        compressionQuality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function StandardItemWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const editId = searchParams.get('edit');
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state - Step 1 (Item)
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || "");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [displayMode, setDisplayMode] = useState<"direct" | "customization">("direct");
  
  // Form state - Step 2 (Preço)
  const [price, setPrice] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [hasPromotion, setHasPromotion] = useState(false);
  const [hasStockControl, setHasStockControl] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState(5);
  const [unit, setUnit] = useState("un");
  
  // Form state - Step 3 (Disponibilidade)
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
        .or("category_type.is.null,category_type.neq.pizza")
        .order("display_order");

      setCategories((cats as Category[]) || []);

      // Auto-select category from URL or first available
      if (categoryId) {
        setSelectedCategoryId(categoryId);
      } else if (cats && cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadItemForEdit = async (itemId: string) => {
    try {
      const { data: item } = await supabase
        .from("products")
        .select("*")
        .eq("id", itemId)
        .single();

      if (item) {
        setSelectedCategoryId(item.category_id || "");
        setItemName(item.name);
        setDescription(item.description || "");
        setImageUrl(item.image_url);
        setIsActive(item.is_available ?? true);
        
        // Format price for display
        if (item.price) {
          setPrice(formatCurrencyValue(Math.round(item.price * 100).toString()));
        }
        if (item.promotional_price) {
          setHasPromotion(true);
          setPromotionalPrice(formatCurrencyValue(Math.round(item.promotional_price * 100).toString()));
        }
        
        // Stock control
        setHasStockControl(item.has_stock_control ?? false);
        setStockQuantity(item.stock_quantity ?? 0);
        setMinStockAlert(item.min_stock_alert ?? 5);
        setUnit(item.unit || "un");
      }
    } catch (error) {
      console.error("Error loading item for edit:", error);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    setUploading(true);
    try {
      let uploadBlob: Blob = file;
      let extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = file.type;

      try {
        const { blob: compressedBlob, isPng } = await compressImage(file, 800, 0.85);
        uploadBlob = compressedBlob;
        extension = isPng ? "png" : "jpg";
        contentType = isPng ? "image/png" : "image/jpeg";
      } catch (compressionError) {
        console.warn("Compression failed, using original file:", compressionError);
      }

      const fileName = `menu-items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, uploadBlob, { contentType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  // Format currency input
  const formatCurrencyValue = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue || "0", 10) / 100;
    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePriceChange = (inputValue: string, setter: (value: string) => void) => {
    const numericValue = inputValue.replace(/\D/g, "");
    setter(formatCurrencyValue(numericValue));
  };

  const parseCurrencyToNumber = (value: string): number => {
    const numericValue = value.replace(/\D/g, "");
    return parseInt(numericValue || "0", 10) / 100;
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
      if (!price || parseCurrencyToNumber(price) <= 0) {
        toast.error("Defina um preço válido");
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
      const itemData = {
        store_id: storeId,
        category_id: selectedCategoryId,
        name: itemName,
        description: description || null,
        image_url: imageUrl,
        price: parseCurrencyToNumber(price),
        promotional_price: hasPromotion ? parseCurrencyToNumber(promotionalPrice) : null,
        is_available: isActive,
        has_stock_control: hasStockControl,
        stock_quantity: hasStockControl ? stockQuantity : null,
        min_stock_alert: hasStockControl ? minStockAlert : null,
        unit: hasStockControl ? unit : null,
        display_mode: displayMode,
      };

      if (editId) {
        const { error } = await supabase
          .from("products")
          .update(itemData)
          .eq("id", editId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("products")
          .insert(itemData);

        if (error) throw error;
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
            {STANDARD_ITEM_STEPS.map((step) => {
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
                      Defina nome, descrição e imagem do item
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
                          placeholder="Ex.: X-Tudo, Açaí 500ml, Coca-Cola 2L etc."
                          className="h-10 border-[#e1e1e1] bg-white text-[#2b2b2b] placeholder:text-[#9d9d9d]"
                          maxLength={100}
                        />
                        <span className="text-xs text-[#9d9d9d]">{itemName.length}/100</span>
                      </div>

                      {/* Descrição */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#2b2b2b]">Descrição (ingredientes)</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Ex.: Pão, hambúrguer, queijo, presunto, ovo, bacon, alface, tomate e maionese."
                          className="min-h-[80px] border-[#e1e1e1] bg-white text-[#2b2b2b] placeholder:text-[#9d9d9d] resize-none"
                          maxLength={500}
                        />
                        <span className="text-xs text-[#9d9d9d]">{description.length}/500</span>
                      </div>

                      {/* Display Mode */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-[#2b2b2b]">Como exibir no cardápio?</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setDisplayMode("direct")}
                            className={cn(
                              "p-4 rounded-lg border-2 text-left transition-all",
                              displayMode === "direct"
                                ? "border-[#009aff] bg-blue-50"
                                : "border-[#e1e1e1] hover:border-[#009aff]/50"
                            )}
                          >
                            <div className="text-sm font-medium mb-1">📋 Direto no cardápio</div>
                            <div className="text-xs text-[#9d9d9d]">
                              O cliente adiciona ao carrinho direto da tela principal
                            </div>
                          </button>
                          <button
                            onClick={() => setDisplayMode("customization")}
                            className={cn(
                              "p-4 rounded-lg border-2 text-left transition-all",
                              displayMode === "customization"
                                ? "border-[#009aff] bg-blue-50"
                                : "border-[#e1e1e1] hover:border-[#009aff]/50"
                            )}
                          >
                            <div className="text-sm font-medium mb-1">🎨 Tela de personalização</div>
                            <div className="text-xs text-[#9d9d9d]">
                              Abre uma tela para escolher sabores, adicionais etc.
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Image Upload */}
                    <div className="w-64 space-y-2">
                      <Label className="text-sm font-medium text-[#2b2b2b]">Foto do item (opcional)</Label>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label 
                        onClick={() => !uploading && imageInputRef.current?.click()}
                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#5bbcfc] rounded-lg bg-white cursor-pointer hover:bg-blue-50/30 transition-colors"
                      >
                        {uploading ? (
                          <Loader2 className="w-10 h-10 text-[#5bbcfc] animate-spin" />
                        ) : imageUrl ? (
                          <div className="relative w-full h-full">
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageUrl(null);
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center p-4">
                            <ImagePlus className="w-10 h-10 text-[#5bbcfc] mb-2" />
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

              {/* Step 2 - Preço */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">2. Preço</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina o preço e promoções do item
                    </p>
                  </div>

                  <div className="space-y-5 max-w-md">
                    {/* Preço */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#2b2b2b]">
                        Preço <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center h-12 border border-[#e1e1e1] rounded-md bg-white overflow-hidden">
                        <div className="h-full w-12 flex items-center justify-center border-r border-[#e1e1e1] bg-[#f5f5f5]">
                          <span className="text-sm text-[#5a5a5a]">R$</span>
                        </div>
                        <input
                          type="text"
                          value={price}
                          onChange={(e) => handlePriceChange(e.target.value, setPrice)}
                          placeholder="0,00"
                          className="flex-1 px-4 text-lg h-full bg-transparent outline-none text-[#2b2b2b]"
                        />
                      </div>
                    </div>

                    {/* Promoção */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={hasPromotion}
                          onCheckedChange={setHasPromotion}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <Label className="text-sm font-medium text-[#2b2b2b]">
                          Este item está em promoção
                        </Label>
                      </div>

                      {hasPromotion && (
                        <div className="space-y-2 pl-10">
                          <Label className="text-sm text-[#5a5a5a]">Preço promocional</Label>
                          <div className="flex items-center h-12 border border-green-300 rounded-md bg-green-50 overflow-hidden">
                            <div className="h-full w-12 flex items-center justify-center border-r border-green-300 bg-green-100">
                              <span className="text-sm text-green-700">R$</span>
                            </div>
                            <input
                              type="text"
                              value={promotionalPrice}
                              onChange={(e) => handlePriceChange(e.target.value, setPromotionalPrice)}
                              placeholder="0,00"
                              className="flex-1 px-4 text-lg h-full bg-transparent outline-none text-green-700"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controle de Estoque */}
                    <div className="space-y-4 p-4 bg-[#f5f5f5] rounded-lg border border-[#e1e1e1]">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="stockControl"
                          checked={hasStockControl}
                          onCheckedChange={(checked) => setHasStockControl(!!checked)}
                          className="data-[state=checked]:bg-[#009aff] data-[state=checked]:border-[#009aff]"
                        />
                        <div>
                          <Label htmlFor="stockControl" className="text-sm font-medium text-[#2b2b2b] flex items-center gap-2 cursor-pointer">
                            <Package className="w-4 h-4" />
                            Controlar estoque deste item
                          </Label>
                          <p className="text-xs text-[#9d9d9d]">
                            Ative para acompanhar quantidade e receber alertas
                          </p>
                        </div>
                      </div>

                      {hasStockControl && (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-[#5a5a5a]">Estoque inicial</Label>
                            <Input
                              type="number"
                              min="0"
                              value={stockQuantity}
                              onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                              className="h-10 border-[#e1e1e1]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-[#5a5a5a]">Alerta mínimo</Label>
                            <Input
                              type="number"
                              min="0"
                              value={minStockAlert}
                              onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                              className="h-10 border-[#e1e1e1]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-[#5a5a5a]">Unidade</Label>
                            <Select value={unit} onValueChange={setUnit}>
                              <SelectTrigger className="h-10 border-[#e1e1e1]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-[#e1e1e1]">
                                <SelectItem value="un">Unidade (un)</SelectItem>
                                <SelectItem value="kg">Quilograma (kg)</SelectItem>
                                <SelectItem value="g">Grama (g)</SelectItem>
                                <SelectItem value="l">Litro (L)</SelectItem>
                                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                                <SelectItem value="cx">Caixa (cx)</SelectItem>
                                <SelectItem value="pct">Pacote (pct)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 - Disponibilidade */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#2b2b2b]">3. Disponibilidade</h2>
                    <p className="text-sm text-[#9d9d9d] mt-1">
                      Defina se este item está disponível no cardápio
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
                          O item aparecerá no cardápio para os clientes
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
                          O item não aparecerá no cardápio
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-[#f5f5f5] rounded-lg border border-[#e1e1e1]">
                    <h3 className="font-medium text-[#2b2b2b] mb-3">Resumo do Item</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Nome:</span>
                        <span className="font-medium text-[#2b2b2b]">{itemName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Preço:</span>
                        <span className="font-medium text-[#2b2b2b]">
                          R$ {price || "0,00"}
                        </span>
                      </div>
                      {hasPromotion && (
                        <div className="flex justify-between">
                          <span className="text-[#9d9d9d]">Preço promocional:</span>
                          <span className="font-medium text-green-600">
                            R$ {promotionalPrice || "0,00"}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#9d9d9d]">Exibição:</span>
                        <span className="font-medium text-[#2b2b2b]">
                          {displayMode === "direct" ? "Direto no cardápio" : "Tela de personalização"}
                        </span>
                      </div>
                      {hasStockControl && (
                        <div className="flex justify-between">
                          <span className="text-[#9d9d9d]">Estoque:</span>
                          <span className="font-medium text-[#2b2b2b]">
                            {stockQuantity} {unit}
                          </span>
                        </div>
                      )}
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
            {currentStep === 3 ? (loading ? "Salvando..." : "Salvar Item") : "Avançar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
