// Settings General Tab - Extracted from SettingsPage
import { memo } from 'react';
import { Store, QrCode, ImageIcon, Palette, Info, Download, Printer, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { QRCodeSVG } from 'qrcode.react';

interface StoreSettings {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  about_us: string;
  open_hour: number;
  close_hour: number;
  is_open_override: boolean | null;
}

interface SettingsGeneralTabProps {
  settings: StoreSettings;
  onSettingsChange: (settings: StoreSettings) => void;
  onShowQrModal: () => void;
  getStoreUrl: () => string;
  getStatusLabel: () => string;
}

// Available fonts for the storefront
const FONT_OPTIONS = [
  { id: 'Inter', name: 'Inter', family: "'Inter', sans-serif", category: 'Modernas' },
  { id: 'Poppins', name: 'Poppins', family: "'Poppins', sans-serif", category: 'Modernas' },
  { id: 'Roboto', name: 'Roboto', family: "'Roboto', sans-serif", category: 'Modernas' },
  { id: 'Open Sans', name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'Modernas' },
  { id: 'Montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Modernas' },
  { id: 'Playfair Display', name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Elegantes' },
  { id: 'Dancing Script', name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Manuscritas' },
  { id: 'Pacifico', name: 'Pacifico', family: "'Pacifico', cursive", category: 'Manuscritas' },
];

export const SettingsGeneralTab = memo(function SettingsGeneralTab({
  settings,
  onSettingsChange,
  onShowQrModal,
  getStoreUrl,
  getStatusLabel,
}: SettingsGeneralTabProps) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getStoreUrl());
    } catch {}
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
  };

  return (
    <div className="space-y-3">
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
                onClick={onShowQrModal}
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
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
                onChange={(url) => onSettingsChange({ ...settings, logo_url: url })}
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
                onChange={(url) => onSettingsChange({ ...settings, banner_url: url })}
                bucket="banners"
                folder={settings.id}
                aspectRatio="banner"
                placeholder="Banner (1200x400)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors and Font */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            Cores e Fonte do Cardápio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">Cor Primária</Label>
              <div className="flex gap-1">
                <Input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => onSettingsChange({ ...settings, primary_color: e.target.value })}
                  className="w-7 h-6 p-0.5 cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => onSettingsChange({ ...settings, primary_color: e.target.value })}
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
                  onChange={(e) => onSettingsChange({ ...settings, secondary_color: e.target.value })}
                  className="w-7 h-6 p-0.5 cursor-pointer"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => onSettingsChange({ ...settings, secondary_color: e.target.value })}
                  className="flex-1 h-6 text-[9px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px]">Fonte do Cardápio</Label>
            <Select
              value={settings.font_family}
              onValueChange={(value) => onSettingsChange({ ...settings, font_family: value })}
            >
              <SelectTrigger className="h-7 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {['Modernas', 'Elegantes', 'Manuscritas'].map((category) => (
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
        </CardContent>
      </Card>

      {/* About Us */}
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
            onChange={(e) => onSettingsChange({ ...settings, about_us: e.target.value })}
            className="text-[10px] min-h-[60px]"
            placeholder="Conte sobre seu restaurante..."
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
});
