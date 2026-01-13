import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Palette, Store, ShoppingCart, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Temas pré-definidos por tipo de estabelecimento
export const MENU_THEMES = [
  {
    id: "amber",
    name: "Padrão",
    description: "Amarelo clássico",
    bgClass: "bg-amber-50/80",
    borderClass: "border-amber-100/50",
    hoverClass: "hover:bg-amber-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#fffbeb", border: "#fef3c7", hover: "#fef3c7" },
    primaryColor: "#f59e0b", // Amber
    secondaryColor: "#d97706"
  },
  {
    id: "purple",
    name: "Açaí",
    description: "Roxo vibrante",
    bgClass: "bg-purple-50/80",
    borderClass: "border-purple-100/50",
    hoverClass: "hover:bg-purple-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#faf5ff", border: "#f3e8ff", hover: "#f3e8ff" },
    primaryColor: "#9333ea", // Purple
    secondaryColor: "#7c3aed"
  },
  {
    id: "red",
    name: "Hamburgueria",
    description: "Vermelho intenso",
    bgClass: "bg-red-50/80",
    borderClass: "border-red-100/50",
    hoverClass: "hover:bg-red-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#fef2f2", border: "#fee2e2", hover: "#fee2e2" },
    primaryColor: "#dc2626", // Red
    secondaryColor: "#b91c1c"
  },
  {
    id: "orange",
    name: "Pizzaria",
    description: "Laranja quente",
    bgClass: "bg-orange-50/80",
    borderClass: "border-orange-100/50",
    hoverClass: "hover:bg-orange-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#fff7ed", border: "#ffedd5", hover: "#ffedd5" },
    primaryColor: "#ea580c", // Orange
    secondaryColor: "#c2410c"
  },
  {
    id: "emerald",
    name: "Saudável",
    description: "Verde natural",
    bgClass: "bg-emerald-50/80",
    borderClass: "border-emerald-100/50",
    hoverClass: "hover:bg-emerald-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#ecfdf5", border: "#d1fae5", hover: "#d1fae5" },
    primaryColor: "#10b981", // Emerald
    secondaryColor: "#059669"
  },
  {
    id: "sky",
    name: "Frutos do Mar",
    description: "Azul oceano",
    bgClass: "bg-sky-50/80",
    borderClass: "border-sky-100/50",
    hoverClass: "hover:bg-sky-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#f0f9ff", border: "#e0f2fe", hover: "#e0f2fe" },
    primaryColor: "#0284c7", // Sky
    secondaryColor: "#0369a1"
  },
  {
    id: "rose",
    name: "Confeitaria",
    description: "Rosa delicado",
    bgClass: "bg-rose-50/80",
    borderClass: "border-rose-100/50",
    hoverClass: "hover:bg-rose-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#fff1f2", border: "#ffe4e6", hover: "#ffe4e6" },
    primaryColor: "#e11d48", // Rose
    secondaryColor: "#be185d"
  },
  {
    id: "slate",
    name: "Elegante",
    description: "Cinza sofisticado",
    bgClass: "bg-slate-50/80",
    borderClass: "border-slate-100/50",
    hoverClass: "hover:bg-slate-100/40",
    darkBgClass: "dark:bg-card",
    colors: { bg: "#f8fafc", border: "#f1f5f9", hover: "#f1f5f9" },
    primaryColor: "#475569", // Slate
    secondaryColor: "#334155"
  }
];

// Função para obter cores do tema para o cardápio
export function getThemeColors(themeId: string | null): { primary: string; secondary: string } | null {
  if (!themeId || themeId.startsWith("#")) return null;
  const theme = MENU_THEMES.find(t => t.id === themeId);
  if (!theme) return null;
  return { primary: theme.primaryColor, secondary: theme.secondaryColor };
}

// Função para obter as classes CSS baseadas no tema
export function getMenuThemeClasses(themeId: string | null) {
  // Se é uma cor hex customizada
  if (themeId?.startsWith("#")) {
    return {
      isCustom: true,
      customColor: themeId,
      bgClass: "",
      borderClass: "",
      hoverClass: "",
      darkBgClass: "dark:bg-card"
    };
  }
  
  const theme = MENU_THEMES.find(t => t.id === themeId) || MENU_THEMES[0];
  return {
    isCustom: false,
    customColor: null,
    bgClass: theme.bgClass,
    borderClass: theme.borderClass,
    hoverClass: theme.hoverClass,
    darkBgClass: theme.darkBgClass
  };
}

// Função para gerar estilos inline para cores customizadas
export function getCustomColorStyles(hexColor: string) {
  // Clareia a cor para o fundo (mais suave)
  const lightenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  };
  
  return {
    backgroundColor: lightenColor(hexColor, 92),
    borderColor: lightenColor(hexColor, 85)
  };
}

interface MenuThemeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  syncCustomColor?: boolean;
  onSyncCustomColorChange?: (sync: boolean) => void;
  storeName?: string;
  storeLogo?: string | null;
}

export function MenuThemeSelector({ 
  value, 
  onChange, 
  syncCustomColor = false,
  onSyncCustomColorChange,
  storeName = "Minha Loja",
  storeLogo
}: MenuThemeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(value?.startsWith("#") || false);
  const [customColor, setCustomColor] = useState(value?.startsWith("#") ? value : "#6366f1");

  const isCustomSelected = value?.startsWith("#");
  const selectedTheme = !isCustomSelected ? value : null;

  // Get current preview colors
  const getCurrentColors = () => {
    if (isCustomSelected) {
      return { primary: customColor, secondary: darkenColor(customColor, 15) };
    }
    const theme = MENU_THEMES.find(t => t.id === value);
    if (theme) {
      return { primary: theme.primaryColor, secondary: theme.secondaryColor };
    }
    return { primary: "#f59e0b", secondary: "#d97706" };
  };

  const darkenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  };

  const handleThemeSelect = (themeId: string) => {
    setShowCustomPicker(false);
    onChange(themeId);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const previewColors = getCurrentColors();

  return (
    <div className="space-y-4">
      {/* Live Menu Preview */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div 
          className="h-14 relative"
          style={{ 
            background: `linear-gradient(135deg, ${previewColors.primary} 0%, ${previewColors.secondary} 100%)` 
          }}
        >
          <div className="absolute inset-0 bg-black/10 flex items-center px-3 gap-2">
            {storeLogo ? (
              <img src={storeLogo} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/50" />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white/30"
                style={{ backgroundColor: previewColors.secondary }}
              >
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-white text-xs font-semibold drop-shadow">{storeName}</p>
              <p className="text-white/80 text-[8px]">Aberto agora • 4.8 ★</p>
            </div>
          </div>
        </div>
        <div className="p-2 space-y-2">
          {/* Category tabs preview */}
          <div className="flex gap-1.5 overflow-hidden">
            <div 
              className="px-2 py-1 rounded-full text-[8px] font-medium text-white"
              style={{ backgroundColor: previewColors.primary }}
            >
              🍕 Pizzas
            </div>
            <div className="px-2 py-1 rounded-full text-[8px] font-medium bg-gray-100 text-gray-600">
              🍔 Lanches
            </div>
            <div className="px-2 py-1 rounded-full text-[8px] font-medium bg-gray-100 text-gray-600">
              🥤 Bebidas
            </div>
          </div>
          {/* Product cards preview */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="border rounded p-1.5 bg-gray-50">
              <div className="h-8 bg-gray-200 rounded mb-1" />
              <p className="text-[8px] font-medium truncate">Pizza Margherita</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[8px] font-bold" style={{ color: previewColors.primary }}>R$ 45,90</span>
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: previewColors.primary }}
                >
                  <ShoppingCart className="w-2 h-2 text-white" />
                </div>
              </div>
            </div>
            <div className="border rounded p-1.5 bg-gray-50">
              <div className="h-8 bg-gray-200 rounded mb-1" />
              <p className="text-[8px] font-medium truncate">Hambúrguer Classic</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[8px] font-bold" style={{ color: previewColors.primary }}>R$ 32,90</span>
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: previewColors.primary }}
                >
                  <ShoppingCart className="w-2 h-2 text-white" />
                </div>
              </div>
            </div>
          </div>
          {/* Floating button preview */}
          <div className="flex justify-end">
            <div 
              className="px-3 py-1 rounded-full text-[8px] text-white font-medium flex items-center gap-1"
              style={{ backgroundColor: previewColors.primary }}
            >
              <ShoppingCart className="w-2.5 h-2.5" />
              Ver Carrinho
            </div>
          </div>
        </div>
        <div className="bg-gray-100 px-2 py-1 text-center">
          <span className="text-[8px] text-gray-500">Preview do Cardápio</span>
        </div>
      </div>

      {/* Temas Pré-definidos */}
      <div>
        <Label className="text-xs font-medium mb-2 block">Temas por Segmento</Label>
        <div className="grid grid-cols-4 gap-2">
          {MENU_THEMES.map((theme) => (
            <motion.button
              key={theme.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleThemeSelect(theme.id)}
              className={cn(
                "relative p-2 rounded-lg border-2 transition-all text-left",
                theme.bgClass,
                selectedTheme === theme.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/20"
              )}
            >
              {selectedTheme === theme.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}
              <div className="space-y-1">
                <div 
                  className="w-full h-6 rounded border-2"
                  style={{ 
                    backgroundColor: theme.colors.bg,
                    borderColor: theme.primaryColor 
                  }} 
                />
                <p className="text-[10px] font-medium text-foreground">{theme.name}</p>
                <p className="text-[8px] text-muted-foreground">{theme.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cor Personalizada */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            Cor Personalizada
          </Label>
          <Button
            type="button"
            variant={showCustomPicker ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => {
              setShowCustomPicker(!showCustomPicker);
              if (!showCustomPicker) {
                onChange(customColor);
              }
            }}
          >
            {showCustomPicker ? "Usando personalizada" : "Personalizar"}
          </Button>
        </div>
        
        <AnimatePresence>
          {showCustomPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="w-12 h-8 p-0.5 cursor-pointer"
                />
                <Input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                      handleCustomColorChange(e.target.value);
                    }
                  }}
                  placeholder="#000000"
                  className="flex-1 h-8 text-xs font-mono"
                />
              </div>

              {/* Toggle para sincronizar com cardápio */}
              {onSyncCustomColorChange && (
                <div 
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] font-medium">Sincronizar com cardápio</p>
                      <p className="text-[8px] text-muted-foreground">Aplicar cor ao menu do cliente</p>
                    </div>
                  </div>
                  <Switch
                    checked={syncCustomColor}
                    onCheckedChange={onSyncCustomColorChange}
                    className="scale-75"
                  />
                </div>
              )}
              
              {/* Preview compacto da sidebar */}
              <div 
                className="p-2 rounded-lg border-2 transition-all"
                style={getCustomColorStyles(customColor)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: customColor }}
                  >
                    <Store className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-[9px] font-medium">Prévia da Sidebar</p>
                    <p className="text-[8px] text-muted-foreground">{customColor}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
