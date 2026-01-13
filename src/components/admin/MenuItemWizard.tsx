import React, { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown,
  X,
  ImagePlus,
  DollarSign,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  Scissors,
  Leaf,
  Sprout,
  WheatOff,
  CandyOff,
  MilkOff,
  Snowflake,
  Wine,
  Citrus,
  Loader2,
  GripVertical,
  Download,
  Package
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
}

interface MenuItemWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  preselectedCategoryId?: string;
  onSave: (data: ItemFormData, action: 'save' | 'save-and-new') => void;
}

interface ScheduleItem {
  days: string[];
  startTime: string;
  endTime: string;
}

interface DayPrice {
  basePrice: string;
  hasPromotion: boolean;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
}

interface AddonGroup {
  id: string;
  name: string;
  items: { id: string; name: string; price: number }[];
}

export interface ItemFormData {
  categoryId: string;
  name: string;
  description: string;
  soldByKg: boolean;
  price: string;
  imageUrl: string | null;
  priceByDay: Record<string, DayPrice>;
  hasAddons: boolean;
  addonGroups: AddonGroup[];
  classification: 'food' | 'drink';
  dietaryRestrictions: string[];
  availability: 'always' | 'paused' | 'scheduled';
  schedules: ScheduleItem[];
  // Stock control fields
  hasStockControl: boolean;
  stockQuantity: number;
  minStockAlert: number;
  unit: string;
}

const DAYS = [
  { key: 'sunday', label: 'Domingo', short: 'D' },
  { key: 'monday', label: 'Segunda-feira', short: 'S' },
  { key: 'tuesday', label: 'Terça-feira', short: 'T' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Q' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Q' },
  { key: 'friday', label: 'Sexta-feira', short: 'S' },
  { key: 'saturday', label: 'Sábado', short: 'S' },
];

const FOOD_RESTRICTIONS = [
  { key: 'vegetarian', label: 'Vegetariano', description: 'Sem carne de nenhum tipo, como carne bovina, suína, frango, peixes, presunto ou salame', icon: Scissors },
  { key: 'vegan', label: 'Vegano', description: 'Sem produtos de origem animal, como carne, ovo, queijo ou leite', icon: Leaf },
  { key: 'organic', label: 'Orgânico', description: 'Cultivado sem agrotóxicos, segundo a lei 10.831', icon: Sprout },
  { key: 'gluten-free', label: 'Sem glúten', description: 'Não contém trigo, cevada ou centeio', icon: WheatOff },
  { key: 'sugar-free', label: 'Sem açúcar', description: 'Não contém nenhum tipo de açúcar (cristal, orgânico, mascavo etc.)', icon: CandyOff },
  { key: 'lactose-free', label: 'Zero lactose', description: 'Não contém lactose, ou seja, leite e seus derivados', icon: MilkOff },
];

const DRINK_RESTRICTIONS = [
  { key: 'lactose-free', label: 'Zero lactose', description: 'Não contém lactose, ou seja, leite e seus derivados', icon: MilkOff },
  { key: 'diet-zero', label: 'Diet | Zero', description: 'Sem adição de açúcares', icon: CandyOff },
];

const DRINK_OTHER_CLASSIFICATIONS = [
  { key: 'cold', label: 'Bebida gelada', description: 'Da geladeira direto para o consumidor', icon: Snowflake },
  { key: 'alcoholic', label: 'Bebida alcoólica', description: 'De 0,5% a 54% em volume, destilados, fermentados etc', icon: Wine },
  { key: 'natural', label: 'Natural', description: 'Preparados na hora com frutas frescas', icon: Citrus },
];

const STEPS = [
  { number: 1, label: 'Item' },
  { number: 2, label: 'Adicionais' },
  { number: 3, label: 'Classificações' },
  { number: 4, label: 'Disponibilidade' },
];

// Compress image using canvas - preserves transparency for PNGs
async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
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

export function MenuItemWizard({
  open,
  onOpenChange,
  categories,
  preselectedCategoryId,
  onSave
}: MenuItemWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const initialPriceByDay: Record<string, DayPrice> = {};
  DAYS.forEach(day => {
    initialPriceByDay[day.key] = {
      basePrice: '0,00',
      hasPromotion: false,
      discountType: 'percentage',
      discountValue: '',
    };
  });

  const [formData, setFormData] = useState<ItemFormData>({
    categoryId: preselectedCategoryId || '',
    name: '',
    description: '',
    soldByKg: false,
    price: '0,00',
    imageUrl: null,
    priceByDay: initialPriceByDay,
    hasAddons: false,
    addonGroups: [],
    classification: 'food',
    dietaryRestrictions: [],
    availability: 'always',
    schedules: [{ days: [], startTime: '00:00', endTime: '23:59' }],
    hasStockControl: false,
    stockQuantity: 0,
    minStockAlert: 5,
    unit: 'un',
  });

  // Navigate to step - only allows going to completed steps or current
  const goToStep = (step: number) => {
    if (step <= highestStepReached) {
      setCurrentStep(step);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep > highestStepReached) {
        setHighestStepReached(nextStep);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = (action: 'save' | 'save-and-new') => {
    onSave(formData, action);
    if (action === 'save-and-new') {
      // Reset form for new item
      setFormData({
        categoryId: preselectedCategoryId || formData.categoryId,
        name: '',
        description: '',
        soldByKg: false,
        price: '0,00',
        imageUrl: null,
        priceByDay: initialPriceByDay,
        hasAddons: false,
        addonGroups: [],
        classification: 'food',
        dietaryRestrictions: [],
        availability: 'always',
        schedules: [{ days: [], startTime: '00:00', endTime: '23:59' }],
        hasStockControl: false,
        stockQuantity: 0,
        minStockAlert: 5,
        unit: 'un',
      });
      setCurrentStep(1);
      setHighestStepReached(1);
    } else {
      onOpenChange(false);
    }
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept any image
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    setUploading(true);
    try {
      // Try to compress, but fallback to original if compression fails
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
        // Use original file if compression fails
      }

      const fileName = `menu-items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product-images')
        .upload(fileName, uploadBlob, { 
          contentType,
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(uploadError.message || "Erro no upload");
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, imageUrl: urlData.publicUrl }));
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error("Upload error details:", error);
      toast.error(error.message || "Erro ao enviar imagem. Tente novamente.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: null }));
  };

  const toggleDay = (scheduleIndex: number, dayKey: string) => {
    setFormData(prev => {
      const newSchedules = [...prev.schedules];
      const days = newSchedules[scheduleIndex].days;
      if (days.includes(dayKey)) {
        newSchedules[scheduleIndex].days = days.filter(d => d !== dayKey);
      } else {
        newSchedules[scheduleIndex].days = [...days, dayKey];
      }
      return { ...prev, schedules: newSchedules };
    });
  };

  const addSchedule = () => {
    setFormData(prev => ({
      ...prev,
      schedules: [...prev.schedules, { days: [], startTime: '00:00', endTime: '23:59' }],
    }));
  };

  const removeSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index),
    }));
  };

  const toggleDietaryRestriction = (key: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(key)
        ? prev.dietaryRestrictions.filter(r => r !== key)
        : [...prev.dietaryRestrictions, key],
    }));
  };

  const updatePriceByDay = (dayKey: string, field: keyof DayPrice, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      priceByDay: {
        ...prev.priceByDay,
        [dayKey]: {
          ...prev.priceByDay[dayKey],
          [field]: value,
        },
      },
    }));
  };

  const applyPriceToAll = (dayKey: string) => {
    const sourcePrice = formData.priceByDay[dayKey];
    setFormData(prev => {
      const newPriceByDay: Record<string, DayPrice> = {};
      DAYS.forEach(day => {
        newPriceByDay[day.key] = { ...sourcePrice };
      });
      return { ...prev, priceByDay: newPriceByDay };
    });
  };

  const calculateFinalPrice = (dayPrice: DayPrice): string => {
    if (!dayPrice.hasPromotion || !dayPrice.discountValue) {
      return dayPrice.basePrice;
    }
    const base = parseFloat(dayPrice.basePrice.replace(',', '.')) || 0;
    const discount = parseFloat(dayPrice.discountValue.replace(',', '.')) || 0;
    
    if (dayPrice.discountType === 'percentage') {
      return (base - (base * discount / 100)).toFixed(2).replace('.', ',');
    }
    return Math.max(0, base - discount).toFixed(2).replace('.', ',');
  };

  const renderStep1 = () => (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <div className="flex-1 space-y-4 md:space-y-6 order-2 md:order-1">
        {/* Category */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Categoria <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={formData.categoryId} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Nome do item <span className="text-destructive">*</span>
          </Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex.: X-Tudo, Batata Frita, Água mineral etc."
            maxLength={100}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="hidden sm:inline">Crie um nome que defina este item.</span>
            <span>{formData.name.length}/100</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Descrição</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ex.: Molho, mussarela, tomate finalizado com orégano e azeite."
            maxLength={1000}
            rows={3}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="hidden sm:inline">Descreva os ingredientes deste item.</span>
            <span>{formData.description.length}/1000</span>
          </div>
        </div>

        {/* Sold by KG */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="soldByKg"
            checked={formData.soldByKg}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, soldByKg: checked as boolean }))}
          />
          <div>
            <Label htmlFor="soldByKg" className="text-sm font-medium cursor-pointer">
              Item vendido por kg
            </Label>
            <p className="text-xs text-muted-foreground">
              Para itens que devem ser pesados e vendidos por kg.
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Preço</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg overflow-hidden flex-1 md:flex-none">
              <div className="px-3 py-2 bg-muted border-r">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="R$ 0,00"
                className="border-0 focus-visible:ring-0"
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPriceModal(true)}
            className="w-full sm:w-auto"
          >
            Configurações de preço
          </Button>
        </div>

        {/* Stock Control */}
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <div className="flex items-start gap-3">
            <Checkbox
              id="hasStockControl"
              checked={formData.hasStockControl}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasStockControl: checked as boolean }))}
            />
            <div>
              <Label htmlFor="hasStockControl" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Package className="w-4 h-4" />
                Controlar estoque deste item
              </Label>
              <p className="text-xs text-muted-foreground">
                Ative para acompanhar quantidade em estoque e receber alertas.
              </p>
            </div>
          </div>

          {formData.hasStockControl && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Estoque inicial</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alerta mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStockAlert}
                  onChange={(e) => setFormData(prev => ({ ...prev, minStockAlert: parseInt(e.target.value) || 0 }))}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unidade</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

      {/* Image Upload */}
      <div className="w-full md:w-64 space-y-2 order-1 md:order-2">
        <Label className="text-sm font-medium">Foto do item</Label>
        <input
          ref={imageInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {formData.imageUrl ? (
          <div className="relative border-2 border-dashed border-primary/30 rounded-lg overflow-hidden bg-primary/5 min-h-[150px] md:min-h-[200px]">
            <img
              src={formData.imageUrl}
              alt="Item"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Trocar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-primary/30 rounded-lg p-6 md:p-8 flex flex-col items-center justify-center text-center bg-primary/5 min-h-[150px] md:min-h-[200px] hover:border-primary/50 transition-colors cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-primary/60 mb-3 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-10 h-10 md:w-12 md:h-12 text-primary/60 mb-3" />
                <p className="text-sm font-medium text-amber-600">Escolha a foto</p>
                <p className="text-xs text-muted-foreground">
                  Clique aqui ou arraste a foto para cá.
                </p>
              </>
            )}
          </button>
        )}
        
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Formatos: .png, .jpg, .jpeg, .webp</p>
          <p>Peso máximo: 1mb</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-semibold">2. Adicionais</h3>
          <p className="text-sm text-muted-foreground">Defina os adicionais do seu item</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          Gerenciar grupos de adicionais
        </Button>
      </div>

      <RadioGroup
        value={formData.hasAddons ? 'with' : 'without'}
        onValueChange={(value) => setFormData(prev => ({ ...prev, hasAddons: value === 'with' }))}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          <RadioGroupItem value="without" id="without-addons" className="text-primary" />
          <Label htmlFor="without-addons" className="font-medium cursor-pointer">Sem Adicionais</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="with" id="with-addons" className="text-primary" />
          <Label htmlFor="with-addons" className="font-medium cursor-pointer">Com Adicionais</Label>
        </div>
      </RadioGroup>

      {/* Panel when "Com Adicionais" is selected */}
      {formData.hasAddons && (
        <div className="border rounded-lg p-4 mt-4 space-y-4 bg-muted/30">
          <p className="text-sm font-medium text-muted-foreground">Adicionais</p>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left side - Item preview */}
            <div className="lg:w-48 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Foto do item</p>
              <div className="w-28 h-28 rounded-lg bg-muted flex items-center justify-center border">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Item" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <ImagePlus className="w-10 h-10 text-muted-foreground/50" />
                )}
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Nome do item</p>
                  <p className="text-sm font-medium truncate">{formData.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{formData.description || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Preço</p>
                  <p className="text-sm font-medium">R$ {formData.price}</p>
                </div>
              </div>
            </div>

            {/* Right side - Addons management */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium">Adicionais do Item</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <GripVertical className="w-3 h-3" />
                  <span>Arraste o bloco e defina a ordem no cardápio digital.</span>
                </div>
              </div>

              {/* Addon groups list - empty state */}
              {formData.addonGroups.length === 0 && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <p className="text-sm">Nenhum grupo de adicionais vinculado</p>
                  <p className="text-xs mt-1">Crie um novo grupo ou importe um existente</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Novo Grupo
                </Button>
                <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="w-4 h-4" />
                  Importar Grupo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    const restrictions = formData.classification === 'food' ? FOOD_RESTRICTIONS : DRINK_RESTRICTIONS;
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold">3. Classificações</h3>
          <p className="text-sm text-muted-foreground">Selecione o tipo de item para classificar</p>
        </div>

        {/* Alert */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span>Lembre-se que você é responsável por todas as informações sobre os itens, conforme nossos </span>
            <a href="#" className="text-amber-600 hover:underline">Termos e Condições</a>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Classification Type */}
        <div className="space-y-2">
          <Label className="text-sm">Qual item está sendo classificado?</Label>
          <RadioGroup
            value={formData.classification}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              classification: value as 'food' | 'drink',
              dietaryRestrictions: [] 
            }))}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="food" id="food" className="text-primary" />
              <Label htmlFor="food" className="cursor-pointer">Comida</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="drink" id="drink" className="text-primary" />
              <Label htmlFor="drink" className="cursor-pointer">Bebida</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Dietary Restrictions */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Indique se seu item se adequa a restrições alimentares diversas, para alertar clientes com esse perfil
          </p>
          
          <div className="space-y-3">
            {restrictions.map(restriction => {
              const Icon = restriction.icon;
              return (
                <div key={restriction.key} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <Checkbox
                    id={restriction.key}
                    checked={formData.dietaryRestrictions.includes(restriction.key)}
                    onCheckedChange={() => toggleDietaryRestriction(restriction.key)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={restriction.key} className="font-medium cursor-pointer">
                      {restriction.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{restriction.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Other classifications for drinks */}
          {formData.classification === 'drink' && (
            <>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-3">Outras classificações</p>
                <div className="space-y-3">
                  {DRINK_OTHER_CLASSIFICATIONS.map(classification => {
                    const Icon = classification.icon;
                    return (
                      <div key={classification.key} className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <Checkbox
                          id={classification.key}
                          checked={formData.dietaryRestrictions.includes(classification.key)}
                          onCheckedChange={() => toggleDietaryRestriction(classification.key)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={classification.key} className="font-medium cursor-pointer">
                            {classification.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{classification.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="font-semibold text-sm md:text-base">4. Disponibilidade</h3>
        <p className="text-xs md:text-sm text-muted-foreground">Defina qual disponibilidade seu item terá</p>
      </div>

      {/* Alert */}
      <div className="bg-muted/50 border rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3">
        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-xs md:text-sm">
          <span className="font-medium">Atenção!</span> Existem campos obrigatórios nesta seção.
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <RadioGroup
        value={formData.availability}
        onValueChange={(value) => setFormData(prev => ({ 
          ...prev, 
          availability: value as 'always' | 'paused' | 'scheduled' 
        }))}
        className="space-y-3 md:space-y-4"
      >
        <div className="flex items-start gap-3">
          <RadioGroupItem value="always" id="always" className="mt-1 text-primary" />
          <div>
            <Label htmlFor="always" className="font-medium cursor-pointer text-sm md:text-base">Sempre disponível</Label>
            <p className="text-xs md:text-sm text-muted-foreground">
              O item ficará disponível sempre que o estabelecimento estiver aberto
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RadioGroupItem value="paused" id="paused" className="mt-1 text-primary" />
          <div>
            <Label htmlFor="paused" className="font-medium cursor-pointer text-sm md:text-base">Pausado</Label>
            <p className="text-xs md:text-sm text-muted-foreground">
              Não aparecerá nos seus canais de venda
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RadioGroupItem value="scheduled" id="scheduled" className="mt-1 text-primary" />
          <div className="flex-1">
            <Label htmlFor="scheduled" className="font-medium cursor-pointer text-sm md:text-base">
              Dias e horários específicos
            </Label>
            <p className="text-xs md:text-sm text-muted-foreground">
              Escolha quando o item aparece nos seus canais de venda
            </p>
          </div>
        </div>
      </RadioGroup>

      {/* Schedule picker */}
      {formData.availability === 'scheduled' && (
        <div className="border rounded-lg p-3 md:p-4 space-y-4">
          {formData.schedules.map((schedule, index) => (
            <div key={index} className="space-y-3">
              {/* Mobile Layout */}
              <div className="md:hidden space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Dias disponíveis</Label>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDay(index, day.key)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                          schedule.days.includes(day.key)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Horários</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <div className="px-2 py-1.5 bg-muted">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => {
                          const newSchedules = [...formData.schedules];
                          newSchedules[index].startTime = e.target.value;
                          setFormData(prev => ({ ...prev, schedules: newSchedules }));
                        }}
                        className="border-0 w-[80px] focus-visible:ring-0"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">às</span>
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <div className="px-2 py-1.5 bg-muted">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => {
                          const newSchedules = [...formData.schedules];
                          newSchedules[index].endTime = e.target.value;
                          setFormData(prev => ({ ...prev, schedules: newSchedules }));
                        }}
                        className="border-0 w-[80px] focus-visible:ring-0"
                      />
                    </div>
                    {formData.schedules.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSchedule(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:block space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Dias disponíveis</Label>
                  <Label className="text-sm">Horários</Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {DAYS.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDay(index, day.key)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                          schedule.days.includes(day.key)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <div className="px-2 py-1.5 bg-muted">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => {
                          const newSchedules = [...formData.schedules];
                          newSchedules[index].startTime = e.target.value;
                          setFormData(prev => ({ ...prev, schedules: newSchedules }));
                        }}
                        className="border-0 w-20 focus-visible:ring-0"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">às</span>
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <div className="px-2 py-1.5 bg-muted">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => {
                          const newSchedules = [...formData.schedules];
                          newSchedules[index].endTime = e.target.value;
                          setFormData(prev => ({ ...prev, schedules: newSchedules }));
                        }}
                        className="border-0 w-20 focus-visible:ring-0"
                      />
                    </div>
                    {formData.schedules.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSchedule(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSchedule}
            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Horário
          </button>
        </div>
      )}
    </div>
  );

  const renderPriceModal = () => (
    <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
      <DialogContent 
        className="w-full h-full max-w-full max-h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold">Preço por dia da semana</h2>
          <button onClick={() => setShowPriceModal(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Desktop Header */}
          <div className="hidden lg:grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground">
            <div></div>
            <div>Preço base</div>
            <div>Preço promocional</div>
            <div>Desconto em</div>
            <div>Valor do desconto</div>
            <div>Preço final</div>
          </div>

          {/* Days */}
          {DAYS.map((day, index) => {
            const dayPrice = formData.priceByDay[day.key];
            return (
              <div key={day.key} className="border rounded-lg p-3 lg:border-0 lg:p-0 lg:grid lg:grid-cols-6 lg:gap-4 lg:items-center space-y-3 lg:space-y-0">
                <div className="font-medium text-sm lg:text-base">{day.label}</div>
                
                <div className="flex items-center justify-between lg:block">
                  <span className="text-xs text-muted-foreground lg:hidden">Preço base</span>
                  <Input
                    value={dayPrice.basePrice}
                    onChange={(e) => updatePriceByDay(day.key, 'basePrice', e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-24 lg:w-28"
                  />
                </div>
                
                <div className="flex items-center justify-between lg:block">
                  <span className="text-xs text-muted-foreground lg:hidden">Promoção?</span>
                  <RadioGroup
                    value={dayPrice.hasPromotion ? 'yes' : 'no'}
                    onValueChange={(value) => updatePriceByDay(day.key, 'hasPromotion', value === 'yes')}
                    className="flex gap-3 lg:gap-4"
                  >
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="no" id={`no-promo-${day.key}`} className="text-primary" />
                      <Label htmlFor={`no-promo-${day.key}`} className="text-sm cursor-pointer">Não</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="yes" id={`yes-promo-${day.key}`} className="text-primary" />
                      <Label htmlFor={`yes-promo-${day.key}`} className="text-sm cursor-pointer">Sim</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center justify-between lg:block">
                  {dayPrice.hasPromotion && (
                    <>
                      <span className="text-xs text-muted-foreground lg:hidden">Desconto em</span>
                      <Select
                        value={dayPrice.discountType}
                        onValueChange={(value) => updatePriceByDay(day.key, 'discountType', value)}
                      >
                        <SelectTrigger className="w-20 lg:w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">R$</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
                
                <div className="flex items-center justify-between lg:block">
                  {dayPrice.hasPromotion && (
                    <>
                      <span className="text-xs text-muted-foreground lg:hidden">Valor</span>
                      <Input
                        value={dayPrice.discountValue}
                        onChange={(e) => updatePriceByDay(day.key, 'discountValue', e.target.value)}
                        placeholder="0"
                        className="w-20"
                      />
                    </>
                  )}
                </div>
                
                <div className="flex items-center justify-between lg:justify-start gap-2 pt-2 lg:pt-0 border-t lg:border-0">
                  <span className="text-xs text-muted-foreground lg:hidden">Preço final</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">R$ {calculateFinalPrice(dayPrice)}</span>
                    {index === 0 && (
                      <button
                        onClick={() => applyPriceToAll(day.key)}
                        className="text-primary hover:text-primary/80"
                        title="Aplicar a todos os dias"
                      >
                        <ChevronDown className="w-5 h-5 rotate-180" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 md:gap-4 mt-4 md:mt-6">
          <Button variant="outline" className="flex-1" onClick={() => setShowPriceModal(false)}>
            Cancelar
          </Button>
          <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => setShowPriceModal(false)}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-full h-full max-w-full max-h-full md:max-w-5xl md:h-[90vh] md:rounded-lg flex flex-col p-0"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold">Gestor de cardápio</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="md:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Step Indicator */}
          <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b overflow-x-auto">
            {STEPS.map(step => (
              <button
                key={step.number}
                onClick={() => goToStep(step.number)}
                disabled={step.number > highestStepReached}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentStep === step.number
                    ? 'bg-primary text-primary-foreground'
                    : step.number <= highestStepReached
                    ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                    : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                }`}
              >
                {step.number}. {step.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Desktop only */}
            <div className="hidden md:block w-56 border-r p-4">
              <nav className="space-y-1">
                {STEPS.map(step => (
                  <button
                    key={step.number}
                    onClick={() => goToStep(step.number)}
                    disabled={step.number > highestStepReached}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentStep === step.number
                        ? 'text-primary font-medium border-l-2 border-primary bg-primary/5'
                        : step.number <= highestStepReached
                        ? 'text-muted-foreground hover:text-foreground'
                        : 'text-muted-foreground/50 cursor-not-allowed'
                    }`}
                  >
                    {step.number}. {step.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-muted/30">
              <div className="bg-background rounded-xl p-4 md:p-6 min-h-full">
                {currentStep === 1 && (
                  <div className="mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold">1. Item</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Defina as informações que serão dadas ao seu item
                    </p>
                  </div>
                )}
                
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 md:p-4 border-t flex justify-center gap-3 md:gap-4 bg-muted/30">
            <Button 
              variant="outline" 
              onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
              className="flex-1 md:flex-none md:min-w-[120px]"
            >
              {currentStep === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            
            {currentStep < 4 ? (
              <Button 
                className="bg-primary text-primary-foreground flex-1 md:flex-none md:min-w-[140px]" 
                onClick={handleNext}
              >
                Avançar
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-primary text-primary-foreground flex-1 md:flex-none md:min-w-[140px]">
                    Finalizar
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSave('save-and-new')}>
                    Finalizar e criar outro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave('save')}>
                    Finalizar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {renderPriceModal()}
    </>
  );
}
