import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { DeliveryAreasManager } from "@/components/admin/DeliveryAreasManager";
import { PaymentMethodsManager } from "@/components/admin/PaymentMethodsManager";
import { MenuThemeSelector, getThemeColors } from "@/components/admin/MenuThemeSelector";
import WeeklyScheduleEditor, { WeeklySchedule, DEFAULT_SCHEDULE } from "@/components/admin/WeeklyScheduleEditor";
import { parseSchedule } from "@/lib/scheduleUtils";
import { toast } from "sonner";
import { Loader2, Save, Clock, MapPin, Phone, Palette, Info, ImageIcon, Timer, Store, DollarSign, Truck, QrCode, Printer, Download, ChevronDown, ChevronUp, Copy, ExternalLink, AlertTriangle, Link, ClipboardList, Settings, CreditCard, PanelLeft, User, Lock, Eye, EyeOff, Cloud } from "lucide-react";
import { PrintNodeSettings } from "@/components/admin/PrintNodeSettings";
import { PrintJobHistory } from "@/components/admin/PrintJobHistory";

import { generateStoreSlug } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-input";
import { MaskedInput } from "@/components/ui/masked-input";
import { PixKeyInput } from "@/components/ui/pix-key-input";
import { validateField, settingsValidationSchema } from "@/hooks/useFormValidation";

// Available fonts for the storefront - organized by category
const FONT_OPTIONS = [
  // Modern/Clean
  { id: 'Inter', name: 'Inter', family: "'Inter', sans-serif", category: 'Modernas' },
  { id: 'Poppins', name: 'Poppins', family: "'Poppins', sans-serif", category: 'Modernas' },
  { id: 'Roboto', name: 'Roboto', family: "'Roboto', sans-serif", category: 'Modernas' },
  { id: 'Open Sans', name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'Modernas' },
  { id: 'Montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Modernas' },
  { id: 'Nunito', name: 'Nunito', family: "'Nunito', sans-serif", category: 'Modernas' },
  { id: 'Raleway', name: 'Raleway', family: "'Raleway', sans-serif", category: 'Modernas' },
  { id: 'Lato', name: 'Lato', family: "'Lato', sans-serif", category: 'Modernas' },
  
  // Elegant/Italian
  { id: 'Playfair Display', name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Elegantes' },
  { id: 'Libre Baskerville', name: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'Elegantes' },
  { id: 'Cormorant Garamond', name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Elegantes' },
  { id: 'Cinzel', name: 'Cinzel', family: "'Cinzel', serif", category: 'Elegantes' },
  
  // Handwritten/Artisan
  { id: 'Dancing Script', name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Manuscritas' },
  { id: 'Great Vibes', name: 'Great Vibes', family: "'Great Vibes', cursive", category: 'Manuscritas' },
  { id: 'Pacifico', name: 'Pacifico', family: "'Pacifico', cursive", category: 'Manuscritas' },
  { id: 'Lobster', name: 'Lobster', family: "'Lobster', cursive", category: 'Manuscritas' },
  { id: 'Caveat', name: 'Caveat', family: "'Caveat', cursive", category: 'Manuscritas' },
  { id: 'Kaushan Script', name: 'Kaushan Script', family: "'Kaushan Script', cursive", category: 'Manuscritas' },
  { id: 'Satisfy', name: 'Satisfy', family: "'Satisfy', cursive", category: 'Manuscritas' },
  
  // Japanese/Asian
  { id: 'Noto Serif JP', name: 'Noto Serif JP', family: "'Noto Serif JP', serif", category: 'Japonesas' },
  { id: 'Shippori Mincho', name: 'Shippori Mincho', family: "'Shippori Mincho', serif", category: 'Japonesas' },
  { id: 'M PLUS Rounded 1c', name: 'M PLUS Rounded', family: "'M PLUS Rounded 1c', sans-serif", category: 'Japonesas' },
  
  // Fun/Casual
  { id: 'Berkshire Swash', name: 'Berkshire Swash', family: "'Berkshire Swash', cursive", category: 'Divertidas' },
  { id: 'Abril Fatface', name: 'Abril Fatface', family: "'Abril Fatface', cursive", category: 'Divertidas' },
  { id: 'Permanent Marker', name: 'Permanent Marker', family: "'Permanent Marker', cursive", category: 'Divertidas' },
  { id: 'Shadows Into Light', name: 'Shadows Into Light', family: "'Shadows Into Light', cursive", category: 'Divertidas' },
];

interface StoreSettings {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  open_hour: number;
  close_hour: number;
  is_open_override: boolean | null;
  phone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  google_maps_link: string;
  about_us: string;
  pix_key: string;
  estimated_prep_time: number;
  estimated_delivery_time: number;
  delivery_fee: number;
  min_order_value: number;
  schedule: WeeklySchedule;
  use_comanda_mode: boolean;
  sidebar_color: string;
  printnode_printer_id: string | null;
  printnode_auto_print: boolean;
  printnode_max_retries: number;
  printer_width: '58mm' | '80mm' | 'a4';
  print_footer_message: string | null;
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<StoreSettings | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("geral");
  const [syncCustomColor, setSyncCustomColor] = useState(false);
  const [posterColors, setPosterColors] = useState({
    background: '#dc2626',
    backgroundEnd: '#f97316',
    cardBackground: '#ffffff',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280'
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Define which fields belong to which tab with labels
  const tabFieldsConfig = useMemo(() => ({
    geral: [
      { key: 'name', label: 'Nome do Restaurante' },
      { key: 'logo_url', label: 'Logo' },
      { key: 'banner_url', label: 'Banner' },
      { key: 'primary_color', label: 'Cor Primária' },
      { key: 'secondary_color', label: 'Cor Secundária' },
      { key: 'font_family', label: 'Fonte' },
      { key: 'about_us', label: 'Sobre Nós' }
    ],
    operacao: [
      { key: 'schedule', label: 'Horários' },
      { key: 'is_open_override', label: 'Status da Loja' },
      { key: 'use_comanda_mode', label: 'Modo de Gestão' },
      { key: 'estimated_prep_time', label: 'Tempo de Preparo' },
      { key: 'estimated_delivery_time', label: 'Tempo de Entrega' }
    ],
    delivery: [
      { key: 'delivery_fee', label: 'Taxa de Entrega' },
      { key: 'min_order_value', label: 'Pedido Mínimo' }
    ],
    contato: [
      { key: 'phone', label: 'Telefone' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'pix_key', label: 'Chave PIX' },
      { key: 'address', label: 'Endereço' },
      { key: 'google_maps_link', label: 'Link Google Maps' }
    ],
    personalizar: [
      { key: 'sidebar_color', label: 'Cor do Menu' }
    ]
  }), []);

  // Required fields per tab
  const requiredFields = useMemo(() => ({
    geral: ['name'],
    operacao: [],
    delivery: [],
    contato: [],
    personalizar: []
  }), []);

  // Get validation errors for current settings
  const validationErrors = useMemo(() => {
    if (!settings) return {};
    const errors: Record<string, string | null> = {};
    for (const [field, rules] of Object.entries(settingsValidationSchema)) {
      errors[field] = validateField((settings as any)[field], rules);
    }
    return errors;
  }, [settings]);

  // Check if form has any validation errors
  const hasValidationErrors = useMemo(() => {
    return Object.values(validationErrors).some(error => error !== null);
  }, [validationErrors]);

  // Check tab status (errors and incomplete fields) with details
  const getTabStatus = useCallback((tabName: keyof typeof tabFieldsConfig) => {
    if (!settings) return { hasErrors: false, incompleteCount: 0, errorFields: [], incompleteFields: [] };
    
    const fields = tabFieldsConfig[tabName];
    const required = requiredFields[tabName];
    
    // Get fields with validation errors
    const errorFields = fields.filter(field => 
      validationErrors[field.key] !== null && validationErrors[field.key] !== undefined
    );
    
    // Get incomplete required fields
    const incompleteFields = fields.filter(field => {
      if (!required.includes(field.key)) return false;
      const value = (settings as any)[field.key];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    
    return { 
      hasErrors: errorFields.length > 0, 
      incompleteCount: incompleteFields.length,
      errorFields,
      incompleteFields
    };
  }, [settings, tabFieldsConfig, requiredFields, validationErrors]);

  // Get status for all tabs
  const tabStatuses = useMemo(() => ({
    geral: getTabStatus('geral'),
    operacao: getTabStatus('operacao'),
    delivery: getTabStatus('delivery'),
    contato: getTabStatus('contato'),
    personalizar: getTabStatus('personalizar')
  }), [getTabStatus]);

  // Generate tooltip message for a tab
  const getTabTooltip = useCallback((tabName: keyof typeof tabStatuses) => {
    const status = tabStatuses[tabName];
    const messages: string[] = [];
    
    if (status.errorFields.length > 0) {
      messages.push(`⚠️ Erros: ${status.errorFields.map(f => f.label).join(', ')}`);
    }
    
    if (status.incompleteFields.length > 0) {
      messages.push(`📝 Incompletos: ${status.incompleteFields.map(f => f.label).join(', ')}`);
    }
    
    return messages.length > 0 ? messages.join('\n') : null;
  }, [tabStatuses]);

  const markTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [profile?.store_id]);

  const fetchSettings = async () => {
    try {
      // Get store_id from profile or fetch from user's profile if not available
      let storeId = profile?.store_id;
      
      if (!storeId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("store_id")
          .eq("id", user.id)
          .maybeSingle();
          
        storeId = profileData?.store_id;
      }
      
      if (!storeId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

      if (error) throw error;
      const settingsData = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url,
        banner_url: data.banner_url,
        primary_color: data.primary_color || "#dc2626",
        secondary_color: data.secondary_color || "#f97316",
        font_family: (data as any).font_family || "Inter",
        open_hour: data.open_hour || 8,
        close_hour: data.close_hour || 22,
        is_open_override: data.is_open_override,
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        instagram: data.instagram || "",
        address: data.address || "",
        google_maps_link: (data as any).google_maps_link || "",
        about_us: (data as any).about_us || "",
        pix_key: data.pix_key || "",
        estimated_prep_time: (data as any).estimated_prep_time || 25,
        estimated_delivery_time: (data as any).estimated_delivery_time || 20,
        delivery_fee: data.delivery_fee ?? 5,
        min_order_value: data.min_order_value ?? 0,
        schedule: parseSchedule((data as any).schedule),
        use_comanda_mode: (data as any).use_comanda_mode ?? true,
        sidebar_color: (data as any).sidebar_color || "amber",
        printnode_printer_id: (data as any).printnode_printer_id || null,
        printnode_auto_print: (data as any).printnode_auto_print ?? false,
        printnode_max_retries: (data as any).printnode_max_retries ?? 2,
        printer_width: (data as any).printer_width || '80mm',
        print_footer_message: (data as any).print_footer_message || null,
      };
      setSettings(settingsData);
      setOriginalSettings(settingsData);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    if (!settings) return;

    // Mark all fields as touched to show all errors
    const allFields = Object.keys(settingsValidationSchema);
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));

    // Check for validation errors
    if (hasValidationErrors) {
      toast.error("Corrija os erros antes de salvar");
      return;
    }

    // Generate slug from name + store ID (auto-generated)
    const newSlug = generateStoreSlug(settings.name, settings.id);

    setSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          name: settings.name,
          slug: newSlug,
          logo_url: settings.logo_url,
          banner_url: settings.banner_url,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          font_family: settings.font_family,
          open_hour: settings.open_hour,
          close_hour: settings.close_hour,
          is_open_override: settings.is_open_override,
          phone: settings.phone,
          whatsapp: settings.whatsapp,
          instagram: settings.instagram,
          address: settings.address,
          google_maps_link: settings.google_maps_link,
          about_us: settings.about_us,
          pix_key: settings.pix_key,
          estimated_prep_time: settings.estimated_prep_time,
          estimated_delivery_time: settings.estimated_delivery_time,
          delivery_fee: settings.delivery_fee,
          min_order_value: settings.min_order_value,
          schedule: settings.schedule,
          use_comanda_mode: settings.use_comanda_mode,
          sidebar_color: settings.sidebar_color,
          printnode_printer_id: settings.printnode_printer_id,
          printnode_auto_print: settings.printnode_auto_print,
          printnode_max_retries: settings.printnode_max_retries,
          printer_width: settings.printer_width,
          print_footer_message: settings.print_footer_message,
        } as any)
        .eq("id", settings.id);

      if (error) throw error;
      // Update settings with new slug
      const updatedSettings = { ...settings, slug: newSlug };
      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = () => {
    if (settings?.is_open_override === true) return "🟢 Aberto (forçado)";
    if (settings?.is_open_override === false) return "🔴 Fechado (forçado)";
    
    const now = new Date();
    const currentHour = now.getHours();
    const isOpen = currentHour >= (settings?.open_hour || 8) && currentHour < (settings?.close_hour || 22);
    return isOpen ? "🟢 Aberto (automático)" : "🔴 Fechado (automático)";
  };

  const getStoreUrl = () => {
    return `${window.location.origin}/cardapio/${settings?.slug}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getStoreUrl());
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('settings-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.drawImage(img, 0, 0, 512, 512);
      
      const link = document.createElement('a');
      link.download = `qrcode-${settings?.name || 'restaurante'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    toast.success("QR Code baixado!");
  };

  const printPoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    const storeUrl = getStoreUrl();
    const storeName = settings?.name || 'Restaurante';
    
    const svgElement = document.getElementById('settings-qr-code');
    const svgData = svgElement ? new XMLSerializer().serializeToString(svgElement) : '';
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cartaz QR Code - ${storeName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              size: A4;
              margin: 0;
            }
            body {
              width: 210mm;
              height: 297mm;
              font-family: 'Segoe UI', system-ui, sans-serif;
              background: linear-gradient(135deg, ${posterColors.background} 0%, ${posterColors.backgroundEnd} 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .content {
              text-align: center;
              max-width: 170mm;
            }
            .title {
              font-size: 28pt;
              font-weight: bold;
              color: ${posterColors.cardBackground};
              margin-bottom: 8mm;
              text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .subtitle {
              font-size: 14pt;
              color: ${posterColors.cardBackground};
              opacity: 0.9;
              margin-bottom: 15mm;
            }
            .qr-container {
              background: ${posterColors.cardBackground};
              padding: 12mm;
              border-radius: 8mm;
              display: inline-block;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              margin-bottom: 12mm;
            }
            .qr-code {
              width: 80mm;
              height: 80mm;
            }
            .store-name {
              font-size: 20pt;
              font-weight: bold;
              color: ${posterColors.textPrimary};
              margin-top: 5mm;
            }
            .instructions {
              font-size: 13pt;
              color: ${posterColors.cardBackground};
              margin-top: 10mm;
              line-height: 1.6;
            }
            .url {
              font-size: 10pt;
              color: ${posterColors.cardBackground};
              opacity: 0.8;
              margin-top: 8mm;
              word-break: break-all;
            }
            @media print {
              body {
                background: linear-gradient(135deg, ${posterColors.background} 0%, ${posterColors.backgroundEnd} 100%) !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="title">📱 Faça seu Pedido!</div>
            <div class="subtitle">Escaneie o QR Code e acesse nosso cardápio digital</div>
            <div class="qr-container">
              <img class="qr-code" src="data:image/svg+xml;base64,${svgBase64}" alt="QR Code" />
              <div class="store-name">${storeName}</div>
            </div>
            <div class="instructions">
              Aponte a câmera do seu celular<br/>para o QR Code acima
            </div>
            <div class="url">${storeUrl}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loja não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold dark:text-white">Configurações</h1>
          <p className="text-[11px] text-muted-foreground">Gerencie as configurações do restaurante</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges()} size="sm" className="h-7 text-[10px]">
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          {hasUnsavedChanges() ? "Salvar" : "Salvo"}
        </Button>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges() && (
        <div className="bg-warning/10 border border-warning/30 rounded-md p-2 flex items-center gap-1.5 text-warning">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">Você tem alterações não salvas</span>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que não foram salvas. Deseja sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedDialog(false);
                if (pendingNavigation) {
                  pendingNavigation();
                  setPendingNavigation(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TooltipProvider delayDuration={300}>
          <TabsList className="w-full grid grid-cols-7 h-8 bg-muted/50">
            {/* Tab Geral */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="geral" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <Store className="w-3 h-3 mr-1" />
                  Geral
                  {tabStatuses.geral.hasErrors && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                  {!tabStatuses.geral.hasErrors && tabStatuses.geral.incompleteCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
                  )}
                </TabsTrigger>
              </TooltipTrigger>
              {getTabTooltip('geral') && (
                <TooltipContent side="bottom" className="text-[10px] max-w-[200px]">
                  <div className="space-y-0.5 whitespace-pre-line">{getTabTooltip('geral')}</div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Tab Operação */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="operacao" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <Clock className="w-3 h-3 mr-1" />
                  Operação
                  {tabStatuses.operacao.hasErrors && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                  {!tabStatuses.operacao.hasErrors && tabStatuses.operacao.incompleteCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
                  )}
                </TabsTrigger>
              </TooltipTrigger>
              {getTabTooltip('operacao') && (
                <TooltipContent side="bottom" className="text-[10px] max-w-[200px]">
                  <div className="space-y-0.5 whitespace-pre-line">{getTabTooltip('operacao')}</div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Tab Delivery */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="delivery" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <Truck className="w-3 h-3 mr-1" />
                  Delivery
                  {tabStatuses.delivery.hasErrors && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                  {!tabStatuses.delivery.hasErrors && tabStatuses.delivery.incompleteCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
                  )}
                </TabsTrigger>
              </TooltipTrigger>
              {getTabTooltip('delivery') && (
                <TooltipContent side="bottom" className="text-[10px] max-w-[200px]">
                  <div className="space-y-0.5 whitespace-pre-line">{getTabTooltip('delivery')}</div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Tab Contato */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="contato" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <Phone className="w-3 h-3 mr-1" />
                  Contato
                  {tabStatuses.contato.hasErrors && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                  {!tabStatuses.contato.hasErrors && tabStatuses.contato.incompleteCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
                  )}
                </TabsTrigger>
              </TooltipTrigger>
              {getTabTooltip('contato') && (
                <TooltipContent side="bottom" className="text-[10px] max-w-[200px]">
                  <div className="space-y-0.5 whitespace-pre-line">{getTabTooltip('contato')}</div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Tab Personalizar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="personalizar" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <PanelLeft className="w-3 h-3 mr-1" />
                  Painel
                  {tabStatuses.personalizar.hasErrors && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
              </TooltipTrigger>
              {getTabTooltip('personalizar') && (
                <TooltipContent side="bottom" className="text-[10px] max-w-[200px]">
                  <div className="space-y-0.5 whitespace-pre-line">{getTabTooltip('personalizar')}</div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Tab Impressão */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="impressao" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <Cloud className="w-3 h-3 mr-1" />
                  Impressão
                </TabsTrigger>
              </TooltipTrigger>
            </Tooltip>

            {/* Tab Perfil */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="perfil" className="text-[10px] h-7 data-[state=active]:bg-background relative">
                  <User className="w-3 h-3 mr-1" />
                  Perfil
                </TabsTrigger>
              </TooltipTrigger>
            </Tooltip>
          </TabsList>
        </TooltipProvider>

        {/* TAB: Geral */}
        <TabsContent value="geral" className="mt-3 space-y-3">
          {/* Preview Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Store className="w-3 h-3" />
                Prévia do Cardápio
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-start gap-3 p-2 bg-background rounded-md border">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h3 className="font-semibold text-xs">{settings.name || "Nome do Restaurante"}</h3>
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className={`flex items-center gap-0.5 ${getStatusLabel().includes("Aberto") ? 'text-success' : 'text-destructive'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusLabel().includes("Aberto") ? 'bg-success' : 'bg-destructive'}`} />
                      {getStatusLabel().includes("Aberto") ? "Aberto" : "Fechado"}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {String(settings.open_hour).padStart(2, "0")}h às {String(settings.close_hour).padStart(2, "0")}h
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card className="border-secondary/20 bg-secondary/5">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <QrCode className="w-3 h-3" />
                QR Code do Cardápio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="flex gap-3 items-start">
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="p-1.5 bg-background rounded-md border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => setShowQrModal(true)}
                    title="Clique para ampliar"
                  >
                    <QRCodeSVG
                      id="settings-qr-code"
                      value={getStoreUrl()}
                      size={80}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[9px]">Link</Label>
                    <div className="flex gap-1">
                      <Input
                        value={getStoreUrl()}
                        readOnly
                        className="text-[9px] h-6 bg-muted"
                      />
                      <Button variant="outline" size="icon" onClick={copyLink} className="h-6 w-6">
                        <Copy className="w-2.5 h-2.5" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(getStoreUrl(), '_blank')} className="h-6 w-6">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Button variant="outline" size="sm" onClick={downloadQRCode} className="h-5 text-[9px] px-2">
                      <Download className="w-2.5 h-2.5 mr-1" />
                      Baixar
                    </Button>
                    <Button size="sm" onClick={printPoster} className="h-5 text-[9px] px-2">
                      <Printer className="w-2.5 h-2.5 mr-1" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" />
                Imagens
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[9px]">Logo</Label>
                  <ImageUpload
                    value={settings.logo_url}
                    onChange={(url) => setSettings({ ...settings, logo_url: url })}
                    bucket="establishment-logos"
                    folder={settings.id}
                    aspectRatio="square"
                    placeholder="Logo (quadrado)"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px]">Banner</Label>
                  <ImageUpload
                    value={settings.banner_url}
                    onChange={(url) => setSettings({ ...settings, banner_url: url })}
                    bucket="banners"
                    folder={settings.id}
                    aspectRatio="banner"
                    placeholder="Banner (1200x400)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cores e Fonte */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Palette className="w-3 h-3" />
                Cores e Fonte do Cardápio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              {/* Colors Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px]">Cor Primária</Label>
                  <div className="flex gap-1">
                    <Input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-7 h-6 p-0.5 cursor-pointer"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="flex-1 h-6 text-[9px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px]">Cor Secundária</Label>
                  <div className="flex gap-1">
                    <Input
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-7 h-6 p-0.5 cursor-pointer"
                    />
                    <Input
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="flex-1 h-6 text-[9px]"
                    />
                  </div>
                </div>
              </div>

              {/* Font Selector */}
              <div className="space-y-1">
                <Label className="text-[9px]">Fonte do Cardápio</Label>
                <Select
                  value={settings.font_family}
                  onValueChange={(value) => setSettings({ ...settings, font_family: value })}
                >
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {['Modernas', 'Elegantes', 'Manuscritas', 'Japonesas', 'Divertidas'].map((category) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-[9px] font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                          {category}
                        </div>
                        {FONT_OPTIONS.filter(f => f.category === category).map((font) => (
                          <SelectItem 
                            key={font.id} 
                            value={font.id} 
                            className="text-[10px] pl-4"
                            style={{ fontFamily: font.family }}
                          >
                            {font.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Live Preview */}
              <div className="border rounded-lg overflow-hidden bg-white">
                <div 
                  className="h-12 relative" 
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.secondary_color} 100%)` 
                  }}
                >
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="text-white text-[9px] font-semibold">Banner</span>
                  </div>
                </div>
                <div className="p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded bg-muted flex items-center justify-center overflow-hidden"
                    >
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div style={{ fontFamily: FONT_OPTIONS.find(f => f.id === settings.font_family)?.family }}>
                      <p className="text-[10px] font-semibold text-gray-900">{settings.name || "Nome do Restaurante"}</p>
                      <p className="text-[8px] text-muted-foreground">Prévia com fonte: {settings.font_family}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      className="px-2 py-1 rounded text-[8px] font-medium text-white"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      Botão Primário
                    </button>
                    <button 
                      className="px-2 py-1 rounded text-[8px] font-medium text-white"
                      style={{ backgroundColor: settings.secondary_color }}
                    >
                      Botão Secundário
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sobre Nós */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Sobre Nós
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <Textarea
                value={settings.about_us}
                onChange={(e) => setSettings({ ...settings, about_us: e.target.value })}
                className="text-[10px] min-h-[60px]"
                placeholder="Conte sobre seu restaurante..."
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Operação */}
        <TabsContent value="operacao" className="mt-3 space-y-3">
          {/* Status */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Status da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="p-2 rounded-md bg-muted/50 text-center">
                <span className="text-[10px] font-medium">{getStatusLabel()}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px]">Controle Manual</Label>
                <Select
                  value={settings.is_open_override === null ? "auto" : settings.is_open_override ? "open" : "closed"}
                  onValueChange={(value) => {
                    setSettings({
                      ...settings,
                      is_open_override: value === "auto" ? null : value === "open",
                    });
                  }}
                >
                  <SelectTrigger className="h-6 text-[9px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-[9px]">🕐 Automático</SelectItem>
                    <SelectItem value="open" className="text-[9px]">🟢 Sempre Aberto</SelectItem>
                    <SelectItem value="closed" className="text-[9px]">🔴 Sempre Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Horários */}
          <WeeklyScheduleEditor
            schedule={settings.schedule}
            onChange={(schedule) => setSettings({ ...settings, schedule })}
          />

          {/* Modo de Gestão */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <ClipboardList className="w-3 h-3" />
                Modo de Gestão
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className={`p-2 rounded-md border cursor-pointer transition-all ${
                    settings.use_comanda_mode 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSettings({ ...settings, use_comanda_mode: true })}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center ${
                      settings.use_comanda_mode ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {settings.use_comanda_mode && <div className="w-1 h-1 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="font-medium text-[10px]">🎯 Comandas</p>
                      <p className="text-[8px] text-muted-foreground">Por status</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-2 rounded-md border cursor-pointer transition-all ${
                    !settings.use_comanda_mode 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSettings({ ...settings, use_comanda_mode: false })}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center ${
                      !settings.use_comanda_mode ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {!settings.use_comanda_mode && <div className="w-1 h-1 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="font-medium text-[10px]">📋 Simples</p>
                      <p className="text-[8px] text-muted-foreground">Lista direta</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tempos */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Timer className="w-3 h-3" />
                Tempos Estimados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px]">Preparo (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={settings.estimated_prep_time}
                    onChange={(e) => setSettings({ ...settings, estimated_prep_time: parseInt(e.target.value) || 0 })}
                    className="h-6 text-[9px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px]">Entrega (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={settings.estimated_delivery_time}
                    onChange={(e) => setSettings({ ...settings, estimated_delivery_time: parseInt(e.target.value) || 0 })}
                    className="h-6 text-[9px]"
                  />
                </div>
              </div>

              <div className="p-1.5 rounded bg-muted/50 text-[8px] text-muted-foreground flex gap-3">
                <span>🏠 ~{settings.estimated_prep_time}min</span>
                <span>🛵 ~{settings.estimated_prep_time + settings.estimated_delivery_time}min</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Delivery */}
        <TabsContent value="delivery" className="mt-3 space-y-3">
          {/* Taxas */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" />
                Taxas e Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px]">Taxa de Entrega (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={settings.delivery_fee}
                    onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className="h-6 text-[9px]"
                    placeholder="5.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px]">Pedido Mínimo (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={settings.min_order_value}
                    onChange={(e) => setSettings({ ...settings, min_order_value: parseFloat(e.target.value) || 0 })}
                    className="h-6 text-[9px]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Áreas de Entrega */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Áreas de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <DeliveryAreasManager storeId={settings.id} />
            </CardContent>
          </Card>

          {/* Formas de Pagamento */}
          <PaymentMethodsManager storeId={settings.id} />
        </TabsContent>

        {/* TAB: Contato */}
        <TabsContent value="contato" className="mt-3 space-y-3">
          {/* Dados Básicos */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Store className="w-3 h-3" />
                Dados do Restaurante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="space-y-1">
                <Label className="text-[9px]">Nome</Label>
                <Input
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="h-6 text-[9px]"
                  placeholder="Meu Restaurante"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px]">Telefone</Label>
                  <MaskedInput
                    value={settings.phone}
                    onValueChange={(raw) => setSettings({ ...settings, phone: raw })}
                    maskType="phone"
                    className="h-6 text-[9px]"
                    showSuccessState={false}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px]">WhatsApp</Label>
                  <MaskedInput
                    value={settings.whatsapp}
                    onValueChange={(raw) => setSettings({ ...settings, whatsapp: raw })}
                    maskType="whatsapp"
                    className="h-6 text-[9px]"
                    showSuccessState={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px]">Instagram</Label>
                  <Input
                    value={settings.instagram}
                    onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                    className="h-6 text-[9px]"
                    placeholder="@meurestaurante"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px]">Chave PIX</Label>
                  <Input
                    value={settings.pix_key}
                    onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
                    className="h-6 text-[9px]"
                    placeholder="CPF, CNPJ, e-mail ou chave"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="space-y-1">
                <Label className="text-[9px]">Endereço</Label>
                <Textarea
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="text-[9px] min-h-[40px]"
                  placeholder="Rua, número - Bairro"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px]">Link Google Maps</Label>
                <Input
                  value={settings.google_maps_link}
                  onChange={(e) => setSettings({ ...settings, google_maps_link: e.target.value })}
                  className="h-6 text-[9px]"
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* TAB: Personalizar */}
        <TabsContent value="personalizar" className="mt-3 space-y-3">
          {/* Animação Fluida das Categorias */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Palette className="w-3 h-3" />
                Animação do Cardápio
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Efeito visual nas abas de categorias do cardápio
              </p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Animação Fluida</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Efeito de "gota" que desliza entre as categorias ao trocar
                  </p>
                </div>
                <Button
                  variant={localStorage.getItem(`morph_animation_${settings.id}`) !== "false" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => {
                    const currentValue = localStorage.getItem(`morph_animation_${settings.id}`) !== "false";
                    const newValue = !currentValue;
                    localStorage.setItem(`morph_animation_${settings.id}`, newValue ? "true" : "false");
                    toast.success(newValue ? "Animação fluida ativada!" : "Animação fluida desativada");
                  }}
                >
                  {localStorage.getItem(`morph_animation_${settings.id}`) !== "false" ? "Ligada" : "Desligada"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <PanelLeft className="w-3 h-3" />
                Cor do Menu Lateral
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Personalize a cor do menu do painel administrativo
              </p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <MenuThemeSelector
                value={settings.sidebar_color}
                onChange={(color) => {
                  const themeColors = getThemeColors(color);
                  if (themeColors) {
                    // Sincroniza cores do cardápio com o tema selecionado
                    setSettings({ 
                      ...settings, 
                      sidebar_color: color,
                      primary_color: themeColors.primary,
                      secondary_color: themeColors.secondary
                    });
                  } else if (syncCustomColor) {
                    // Cor personalizada com sincronização ativada
                    const darken = (hex: string, percent: number) => {
                      const num = parseInt(hex.replace("#", ""), 16);
                      const amt = Math.round(2.55 * percent);
                      const R = Math.max(0, (num >> 16) - amt);
                      const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
                      const B = Math.max(0, (num & 0x0000FF) - amt);
                      return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
                    };
                    setSettings({ 
                      ...settings, 
                      sidebar_color: color,
                      primary_color: color,
                      secondary_color: darken(color, 15)
                    });
                  } else {
                    // Cor personalizada - apenas atualiza sidebar
                    setSettings({ ...settings, sidebar_color: color });
                  }
                }}
                syncCustomColor={syncCustomColor}
                onSyncCustomColorChange={(sync) => {
                  setSyncCustomColor(sync);
                  // Se ativou e está usando cor customizada, aplica agora
                  if (sync && settings.sidebar_color?.startsWith("#")) {
                    const color = settings.sidebar_color;
                    const darken = (hex: string, percent: number) => {
                      const num = parseInt(hex.replace("#", ""), 16);
                      const amt = Math.round(2.55 * percent);
                      const R = Math.max(0, (num >> 16) - amt);
                      const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
                      const B = Math.max(0, (num & 0x0000FF) - amt);
                      return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
                    };
                    setSettings({ 
                      ...settings, 
                      primary_color: color,
                      secondary_color: darken(color, 15)
                    });
                  }
                }}
                storeName={settings.name}
                storeLogo={settings.logo_url}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Impressão */}
        <TabsContent value="impressao" className="mt-3 space-y-3">
          <PrintNodeSettings
            storeId={settings.id}
            printerId={settings.printnode_printer_id}
            autoPrint={settings.printnode_auto_print}
            maxRetries={settings.printnode_max_retries ?? 2}
            printerWidth={settings.printer_width || '80mm'}
            logoUrl={settings.logo_url}
            storeName={settings.name}
            storeAddress={settings.address}
            storePhone={settings.phone}
            storeWhatsapp={settings.whatsapp}
            printFooterMessage={settings.print_footer_message}
            onPrinterChange={(printerId) => setSettings({ ...settings, printnode_printer_id: printerId })}
            onAutoPrintChange={(enabled) => setSettings({ ...settings, printnode_auto_print: enabled })}
            onMaxRetriesChange={(maxRetries) => setSettings({ ...settings, printnode_max_retries: maxRetries })}
            onPrinterWidthChange={(width) => setSettings({ ...settings, printer_width: width })}
            onPrintFooterMessageChange={(message) => setSettings({ ...settings, print_footer_message: message })}
          />
          
          <PrintJobHistory 
            storeId={settings.id} 
            printerId={settings.printnode_printer_id}
          />
        </TabsContent>

        {/* TAB: Perfil */}
        <TabsContent value="perfil" className="mt-3 space-y-3">
          {/* Informações do Usuário */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Informações do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="space-y-1">
                <Label className="text-[9px]">Nome</Label>
                <Input
                  value={profile?.full_name || ""}
                  disabled
                  className="h-6 text-[9px] bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px]">Email</Label>
                <Input
                  value={profile?.email || ""}
                  disabled
                  className="h-6 text-[9px] bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Alterar Senha
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Atualize sua senha de acesso
              </p>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              <div className="space-y-1">
                <Label className="text-[9px]">Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-7 text-[10px] pr-8"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-7 w-7"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px]">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-7 text-[10px] pr-8"
                    placeholder="Repita a nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-7 w-7"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full h-7 text-[10px]"
                disabled={changingPassword || !newPassword || !confirmPassword}
                onClick={async () => {
                  if (newPassword.length < 6) {
                    toast.error("A senha deve ter no mínimo 6 caracteres");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast.error("As senhas não coincidem");
                    return;
                  }
                  
                  setChangingPassword(true);
                  try {
                    const { error } = await supabase.auth.updateUser({
                      password: newPassword
                    });
                    
                    if (error) throw error;
                    
                    toast.success("Senha alterada com sucesso!");
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch (error: any) {
                    console.error("Error changing password:", error);
                    toast.error(error.message || "Erro ao alterar senha");
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <QrCode className="w-4 h-4" />
              QR Code do Cardápio
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-lg border shadow-sm">
              <QRCodeSVG
                id="settings-qr-code-large"
                value={getStoreUrl()}
                size={280}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all px-4">
              {getStoreUrl()}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="w-3 h-3 mr-1.5" />
                Copiar Link
              </Button>
              <Button variant="outline" size="sm" onClick={downloadQRCode}>
                <Download className="w-3 h-3 mr-1.5" />
                Baixar
              </Button>
              <Button size="sm" onClick={printPoster}>
                <Printer className="w-3 h-3 mr-1.5" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
