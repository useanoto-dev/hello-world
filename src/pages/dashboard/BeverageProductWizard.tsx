// Beverage Product Wizard Page - Using beverage_products table
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, GlassWater, Image as ImageIcon, Trash2 } from "lucide-react";
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

const BEVERAGE_STEPS = [
  { id: 1, label: "Bebida" },
  { id: 2, label: "Preços" },
  { id: 3, label: "Disponibilidade" },
];

interface Category {
  id: string;
  name: string;
  category_type: string | null;
}

interface BeverageType {
  id: string;
  name: string;
  category_id: string;
}

export default function BeverageProductWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const typeId = searchParams.get('typeId');
  const editId = searchParams.get('edit');
  const fromPage = searchParams.get('from'); // 'beverages' if coming from list page
  
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [beverageTypes, setBeverageTypes] = useState<BeverageType[]>([]);
  
  // Form state - Step 1 (Bebida)
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || "");
  const [selectedBeverageTypeId, setSelectedBeverageTypeId] = useState(typeId || "");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Form state - Step 2 (Preços)
  const [price, setPrice] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  
  // Form state - Step 3 (Disponibilidade)
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadBeverageTypes(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (editId && storeId) {
      loadProductForEdit(editId);
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

      // Load beverage categories only (standard type with bebidas template)
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, category_type")
        .eq("store_id", profile.store_id)
        .eq("category_type", "standard")
        .order("display_order");

      // Filter categories that have beverage_types
      const catsWithBeverageTypes: Category[] = [];
      if (cats) {
        for (const cat of cats) {
          const { count } = await supabase
            .from("beverage_types")
            .select("*", { count: 'exact', head: true })
            .eq("category_id", cat.id);
          
          if (count && count > 0) {
            catsWithBeverageTypes.push(cat as Category);
          }
        }
      }

      setCategories(catsWithBeverageTypes);

      // Auto-select first category or from URL
      if (categoryId) {
        setSelectedCategoryId(categoryId);
      } else if (catsWithBeverageTypes.length > 0) {
        setSelectedCategoryId(catsWithBeverageTypes[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadBeverageTypes = async (catId: string) => {
    try {
      const { data: types } = await supabase
        .from("beverage_types")
        .select("id, name, category_id")
        .eq("category_id", catId)
        .eq("is_active", true)
        .order("display_order");

      if (types && types.length > 0) {
        setBeverageTypes(types as BeverageType[]);
        if (!selectedBeverageTypeId) {
          setSelectedBeverageTypeId(types[0].id);
        }
      } else {
        setBeverageTypes([]);
        toast.info("Configure os tipos de bebida na categoria antes de adicionar produtos");
      }
    } catch (error) {
      console.error("Error loading beverage types:", error);
      setBeverageTypes([]);
    }
  };

  const loadProductForEdit = async (productId: string) => {
    try {
      const { data: product } = await supabase
        .from("beverage_products")
        .select("*")
        .eq("id", productId)
        .single();

      if (product) {
        setSelectedCategoryId(product.category_id);
        setSelectedBeverageTypeId(product.beverage_type_id);
        setProductName(product.name);
        setDescription(product.description || "");
        setImageUrl(product.image_url);
        setPrice(((product.price || 0) * 100).toString());
        setPromotionalPrice(product.promotional_price ? ((product.promotional_price || 0) * 100).toString() : "");
        setIsActive(product.is_active ?? true);
      }
    } catch (error) {
      console.error("Error loading product for edit:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 2MB");
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue || "0", 10) / 100;
    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handlePriceChange = (field: "price" | "promotionalPrice", inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, "");
    if (field === "price") {
      setPrice(numericValue);
    } else {
      setPromotionalPrice(numericValue);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!productName.trim()) {
        toast.error("Nome da bebida é obrigatório");
        return;
      }
      if (!selectedCategoryId) {
        toast.error("Selecione uma categoria");
        return;
      }
      if (!selectedBeverageTypeId) {
        toast.error("Selecione um tipo de bebida");
        return;
      }
    }
    if (currentStep === 2) {
      if (!price || parseInt(price) <= 0) {
        toast.error("Informe o preço da bebida");
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
    if (!storeId || !selectedCategoryId || !selectedBeverageTypeId || !productName.trim()) {
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

      const priceValue = parseInt(price || "0") / 100;
      const promoValue = promotionalPrice ? parseInt(promotionalPrice || "0") / 100 : null;

      if (editId) {
        // Update existing product
        const { error } = await supabase
          .from("beverage_products")
          .update({
            name: productName,
            description: description || null,
            image_url: finalImageUrl,
            beverage_type_id: selectedBeverageTypeId,
            price: priceValue,
            promotional_price: promoValue,
            is_active: isActive,
          })
          .eq("id", editId);

        if (error) throw error;
      } else {
        // Create new product
        const { error } = await supabase
          .from("beverage_products")
          .insert({
            store_id: storeId,
            category_id: selectedCategoryId,
            beverage_type_id: selectedBeverageTypeId,
            name: productName,
            description: description || null,
            image_url: finalImageUrl,
            price: priceValue,
            promotional_price: promoValue,
            is_active: isActive,
          });

        if (error) throw error;
      }

      toast.success(editId ? "Bebida atualizada!" : "Bebida criada com sucesso!");
      
      // Navigate back to origin page
      if (fromPage === 'beverages' && categoryId) {
        navigate(`/dashboard/beverages?categoryId=${categoryId}`);
      } else {
        navigate("/dashboard/products");
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erro ao salvar bebida");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (fromPage === 'beverages' && categoryId) {
      navigate(`/dashboard/beverages?categoryId=${categoryId}`);
    } else {
      navigate("/dashboard/products");
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {editId ? "Editar Bebida" : "Nova Bebida"}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex">
        {/* Sidebar Steps */}
        <div className="w-56 bg-card border-r border-border p-4">
          <div className="space-y-1">
            {BEVERAGE_STEPS.map((step) => {
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
                      ? "bg-primary/10 text-primary border border-primary"
                      : isCompleted
                        ? "text-foreground hover:bg-muted cursor-pointer"
                        : "text-muted-foreground cursor-not-allowed"
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
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              {/* Step 1 - Bebida */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">1. Informações da Bebida</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Defina nome, descrição e tipo da bebida
                    </p>
                  </div>

                  <div className="flex gap-8">
                    {/* Left Column - Form Fields */}
                    <div className="flex-1 space-y-5">
                      {/* Categoria */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Categoria <span className="text-destructive">*</span>
                        </Label>
                        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                          <SelectTrigger className="h-10 border-border bg-card">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border">
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tipo de Bebida */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Tipo de Bebida <span className="text-destructive">*</span>
                        </Label>
                        <Select value={selectedBeverageTypeId} onValueChange={setSelectedBeverageTypeId}>
                          <SelectTrigger className="h-10 border-border bg-card">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border">
                            {beverageTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {beverageTypes.length === 0 && selectedCategoryId && (
                          <p className="text-xs text-amber-600">
                            Nenhum tipo de bebida cadastrado nesta categoria.
                          </p>
                        )}
                      </div>

                      {/* Nome da bebida */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Nome da bebida <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="Ex.: Coca-Cola 350ml, Suco de Laranja etc."
                          className="h-10 border-border bg-card text-foreground placeholder:text-muted-foreground"
                          maxLength={100}
                        />
                        <span className="text-xs text-muted-foreground">{productName.length}/100</span>
                      </div>

                      {/* Descrição */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Descrição</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Ex.: Refrigerante gelado, lata 350ml"
                          className="min-h-[80px] border-border bg-card text-foreground placeholder:text-muted-foreground resize-none"
                          maxLength={500}
                        />
                        <span className="text-xs text-muted-foreground">{description.length}/500</span>
                      </div>
                    </div>

                    {/* Right Column - Image Upload */}
                    <div className="w-48 shrink-0">
                      <Label className="text-sm font-medium text-foreground block mb-2">Foto</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="beverage-image-upload"
                        />
                        <label
                          htmlFor="beverage-image-upload"
                          className="block w-full aspect-square rounded-lg border-2 border-dashed border-border bg-muted/50 cursor-pointer hover:border-primary transition-colors overflow-hidden"
                        >
                          {imageUrl ? (
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <GlassWater className="w-12 h-12 opacity-50" />
                              <span className="text-xs">Clique para adicionar</span>
                            </div>
                          )}
                        </label>
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setImageUrl(null);
                              setImageFile(null);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        JPG, PNG ou WebP. Máx 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 - Preços */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">2. Preços</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Defina o preço e promoção (opcional)
                    </p>
                  </div>

                  <div className="max-w-md space-y-5">
                    {/* Preço */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Preço <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={formatCurrency(price)}
                        onChange={(e) => handlePriceChange("price", e.target.value)}
                        placeholder="R$ 0,00"
                        className="h-12 text-lg font-semibold border-border bg-card"
                      />
                    </div>

                    {/* Preço Promocional */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Preço Promocional <span className="text-muted-foreground text-xs">(opcional)</span>
                      </Label>
                      <Input
                        value={promotionalPrice ? formatCurrency(promotionalPrice) : ""}
                        onChange={(e) => handlePriceChange("promotionalPrice", e.target.value)}
                        placeholder="R$ 0,00"
                        className="h-12 text-lg border-border bg-card"
                      />
                      {promotionalPrice && parseInt(promotionalPrice) > 0 && parseInt(price) > 0 && (
                        <p className="text-xs text-green-600">
                          Desconto de {Math.round(((parseInt(price) - parseInt(promotionalPrice)) / parseInt(price)) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 - Disponibilidade */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">3. Disponibilidade</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure se a bebida estará disponível
                    </p>
                  </div>

                  <div className="max-w-md space-y-5">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Bebida Ativa</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Se desativada, não aparecerá no cardápio
                        </p>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {/* Preview Card */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-medium text-foreground text-sm mb-3">Resumo</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="font-medium text-foreground">{productName || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                          <span className="font-medium text-foreground">
                            {beverageTypes.find(t => t.id === selectedBeverageTypeId)?.name || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preço:</span>
                          <span className="font-medium text-foreground">{formatCurrency(price)}</span>
                        </div>
                        {promotionalPrice && parseInt(promotionalPrice) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Promoção:</span>
                            <span className="font-medium text-green-600">{formatCurrency(promotionalPrice)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={cn("font-medium", isActive ? "text-green-600" : "text-amber-600")}>
                            {isActive ? "Ativa" : "Inativa"}
                          </span>
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

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                handleClose();
              }
            }}
          >
            {currentStep > 1 ? "Voltar" : "Cancelar"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={loading || currentStep === 1 && (!productName.trim() || !selectedBeverageTypeId)}
          >
            {loading ? "Salvando..." : currentStep < 3 ? "Continuar" : "Salvar Bebida"}
          </Button>
        </div>
      </div>
    </div>
  );
}
