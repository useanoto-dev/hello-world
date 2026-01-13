import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2, User, MapPin, Truck, Gift, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { validateCPF } from '@/lib/validators';

const STORAGE_KEY = 'saved_customer_data';

interface SavedData {
  customerName: string;
  customerPhone: string;
  customerCpf?: string;
  street: string;
  number: string;
  complement: string;
  reference: string;
  deliveryAreaId?: string;
}

interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
  min_order_value: number;
  estimated_time: number;
}

interface Table {
  id: string;
  number: string;
  name: string | null;
  capacity: number;
}

export default function CheckoutAddress() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { incompleteOrder, updateIncompleteOrder, cart, totalPrice } = useCart();
  
  const [formData, setFormData] = useState({ 
    customerName: '', 
    customerPhone: '', 
    customerCpf: '',
    tableNumber: '', 
    street: '', 
    number: '', 
    complement: '', 
    reference: '',
    deliveryAreaId: ''
  });
  const [saveData, setSaveData] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);

  useEffect(() => {
    if (!incompleteOrder?.serviceType) {
      navigate(`/cardapio/${slug}/finalizar`);
      return;
    }
    fetchStoreAndAreas();
    loadSavedData();
  }, [incompleteOrder, navigate, slug]);

  const fetchStoreAndAreas = async () => {
    try {
      // Fetch store ID
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (store) {
        setStoreId(store.id);
        
        // Fetch delivery areas
        const { data: areas } = await supabase
          .from('delivery_areas')
          .select('id, name, fee, min_order_value, estimated_time')
          .eq('store_id', store.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        setDeliveryAreas(areas || []);
        
        // Fetch tables for dine-in
        const { data: tablesData } = await supabase
          .from('tables')
          .select('id, number, name, capacity')
          .eq('store_id', store.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        setTables(tablesData || []);
        
        // Check if loyalty program is enabled
        const { data: loyalty } = await supabase
          .from('loyalty_settings')
          .select('is_enabled')
          .eq('store_id', store.id)
          .maybeSingle();
        
        setLoyaltyEnabled(loyalty?.is_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching delivery areas:', error);
    }
  };

  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          customerName: data.customerName || '',
          customerPhone: data.customerPhone || '',
          customerCpf: data.customerCpf || '',
          street: data.street || '',
          number: data.number || '',
          complement: data.complement || '',
          reference: data.reference || '',
          deliveryAreaId: data.deliveryAreaId || '',
        }));
        setHasSavedData(true);
        setSaveData(true);
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
    }
  };

  const handleInputChange = (field: string, value: string) => 
    setFormData(prev => ({ ...prev, [field]: value }));

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  const cpfRaw = formData.customerCpf.replace(/\D/g, '');
  const isCpfValid = cpfRaw.length === 0 || validateCPF(cpfRaw);
  const showCpfError = cpfTouched && cpfRaw.length > 0 && !isCpfValid;

  const handleSaveToggle = (checked: boolean) => {
    setSaveData(checked);
    if (!checked && hasSavedData) {
      handleDeleteSavedData();
    }
  };

  const handleDeleteSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedData(false);
    toast.success('Dados salvos removidos');
  };

  const selectedArea = deliveryAreas.find(a => a.id === formData.deliveryAreaId);

  const handleNext = () => {
    // Validate CPF if provided
    const cpfClean = formData.customerCpf.replace(/\D/g, '');
    if (cpfClean.length > 0 && !validateCPF(cpfClean)) {
      toast.error('CPF inválido. Verifique os dígitos.');
      return;
    }

    // Salva dados se opção habilitada
    if (saveData) {
      const dataToSave: SavedData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone.replace(/\D/g, ''),
        customerCpf: cpfClean,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        reference: formData.reference,
        deliveryAreaId: formData.deliveryAreaId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }

    // Atualiza pedido incompleto
    updateIncompleteOrder({
      cart,
      totalPrice,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone.replace(/\D/g, ''),
      customerCpf: cpfClean || undefined,
      tableNumber: formData.tableNumber,
      address: { 
        street: formData.street, 
        number: formData.number, 
        complement: formData.complement, 
        reference: formData.reference,
        neighborhood: selectedArea?.name || '',
      },
      deliveryArea: selectedArea ? {
        id: selectedArea.id,
        name: selectedArea.name,
        fee: selectedArea.fee,
        min_order_value: selectedArea.min_order_value,
        estimated_time: selectedArea.estimated_time,
      } : undefined,
    });
    
    navigate(`/cardapio/${slug}/finalizar/pagamento`);
  };

  const isDelivery = incompleteOrder?.serviceType === 'delivery';
  const isDineIn = incompleteOrder?.serviceType === 'dine_in';
  
  const isValid = formData.customerName.trim().length >= 2 && 
    formData.customerPhone.replace(/\D/g, '').length >= 10 && 
    (!isDelivery || (formData.street.trim() && formData.number.trim())) && 
    (!isDineIn || formData.tableNumber.trim()) &&
    (cpfRaw.length === 0 || isCpfValid);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/cardapio/${slug}/finalizar`)} 
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold">Seus Dados</h1>
              <p className="text-xs text-muted-foreground">Preencha seus dados para continuar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Dados Pessoais */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold">Dados Pessoais</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome completo *</Label>
              <Input 
                value={formData.customerName} 
                onChange={(e) => handleInputChange('customerName', e.target.value)} 
                placeholder="Digite seu nome"
                className="h-11 text-base"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefone / WhatsApp *</Label>
              <Input 
                value={formatPhone(formData.customerPhone)} 
                onChange={(e) => handleInputChange('customerPhone', e.target.value.replace(/\D/g, ''))} 
                placeholder="(99) 99999-9999"
                type="tel"
                className="h-11 text-base"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  CPF {loyaltyEnabled && <span className="text-primary">(Programa Fidelidade)</span>}
                </Label>
                {loyaltyEnabled && (
                  <span className="text-[10px] text-primary flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Acumule pontos!
                  </span>
                )}
              </div>
              <div className="relative">
                <Input 
                  value={formatCPF(formData.customerCpf)} 
                  onChange={(e) => handleInputChange('customerCpf', e.target.value.replace(/\D/g, ''))} 
                  onBlur={() => setCpfTouched(true)}
                  placeholder="000.000.000-00"
                  type="tel"
                  className={`h-11 text-base pr-10 ${showCpfError ? 'border-destructive focus-visible:ring-destructive' : cpfRaw.length === 11 && isCpfValid ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                {cpfRaw.length === 11 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCpfValid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {showCpfError && (
                <p className="text-xs text-destructive mt-1">CPF inválido - verifique os dígitos</p>
              )}
              {loyaltyEnabled && !showCpfError && (
                <p className="text-xs text-muted-foreground mt-1">
                  Informe seu CPF para acumular pontos automaticamente
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mesa para Consumo Local */}
        {isDineIn && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <Label className="text-xs text-muted-foreground">Número da Mesa *</Label>
            {tables.length > 0 ? (
              <Select
                value={formData.tableNumber}
                onValueChange={(value) => handleInputChange('tableNumber', value)}
              >
                <SelectTrigger className="h-11 text-base mt-1">
                  <SelectValue placeholder="Selecione a mesa" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.number}>
                      Mesa {table.number} {table.name ? `(${table.name})` : ''} - {table.capacity} lugares
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={formData.tableNumber} 
                onChange={(e) => handleInputChange('tableNumber', e.target.value)} 
                placeholder="Ex: 5"
                className="h-11 text-base mt-1"
              />
            )}
          </motion.div>
        )}

        {/* Endereço para Delivery */}
        {isDelivery && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold">Endereço de Entrega</h3>
            </div>
            
            {/* Área de Entrega */}
            {deliveryAreas.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Região de Entrega
                </Label>
                <Select
                  value={formData.deliveryAreaId}
                  onValueChange={(value) => handleInputChange('deliveryAreaId', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione sua região" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{area.name}</span>
                          <span className="text-muted-foreground text-sm">
                            {area.fee > 0 ? `R$ ${area.fee.toFixed(2)}` : 'Grátis'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedArea && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                    <span>🛵 Taxa: R$ {selectedArea.fee.toFixed(2)}</span>
                    <span>⏱️ ~{selectedArea.estimated_time} min</span>
                    {selectedArea.min_order_value > 0 && (
                      <span>📦 Mín: R$ {selectedArea.min_order_value.toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Rua / Avenida *</Label>
              <Input 
                value={formData.street} 
                onChange={(e) => handleInputChange('street', e.target.value)} 
                placeholder="Nome da rua"
                className="h-11 text-base"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Número *</Label>
                <Input 
                  value={formData.number} 
                  onChange={(e) => handleInputChange('number', e.target.value)} 
                  placeholder="123"
                  className="h-11 text-base"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Complemento</Label>
                <Input 
                  value={formData.complement} 
                  onChange={(e) => handleInputChange('complement', e.target.value)} 
                  placeholder="Apto, Bloco..."
                  className="h-11 text-base"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Ponto de referência</Label>
              <Input 
                value={formData.reference} 
                onChange={(e) => handleInputChange('reference', e.target.value)} 
                placeholder="Próximo a..."
                className="h-11 text-base"
              />
            </div>
          </motion.div>
        )}

        {/* Salvar Dados */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Save className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Lembrar meus dados</p>
                <p className="text-xs text-muted-foreground">Para próximos pedidos</p>
              </div>
            </div>
            <Switch 
              checked={saveData} 
              onCheckedChange={handleSaveToggle}
            />
          </div>
          {hasSavedData && (
            <button 
              onClick={handleDeleteSavedData}
              className="mt-3 flex items-center gap-1.5 text-xs text-destructive hover:underline"
            >
              <Trash2 className="w-3 h-3" />
              Excluir dados salvos
            </button>
          )}
        </motion.div>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom">
        <div className="max-w-lg mx-auto">
          <Button 
            onClick={handleNext} 
            disabled={!isValid} 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-base"
          >
            Continuar para Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
}
