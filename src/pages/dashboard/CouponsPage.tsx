// Coupons Management - Anotô SaaS
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Plus, Edit, Trash2, TicketPercent, MoreVertical, 
  Calendar, Copy, Check, BarChart3 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CouponUsageReport from "@/components/admin/CouponUsageReport";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export default function CouponsPage() {
  const { store } = useOutletContext<{ store: any }>();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Form states
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDiscountType, setFormDiscountType] = useState("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [formMinOrderValue, setFormMinOrderValue] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formMaxUsesPerCustomer, setFormMaxUsesPerCustomer] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (store?.id) {
      loadCoupons();
    }
  }, [store?.id]);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast.error("Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  };

  const openNewCouponDialog = () => {
    setEditingCoupon(null);
    setFormCode("");
    setFormDescription("");
    setFormDiscountType("percentage");
    setFormDiscountValue("");
    setFormMinOrderValue("");
    setFormMaxUses("");
    setFormMaxUsesPerCustomer("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditCouponDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDescription(coupon.description || "");
    setFormDiscountType(coupon.discount_type || "percentage");
    setFormDiscountValue(String(coupon.discount_value));
    setFormMinOrderValue(coupon.min_order_value ? String(coupon.min_order_value) : "");
    setFormMaxUses(coupon.max_uses ? String(coupon.max_uses) : "");
    setFormMaxUsesPerCustomer(coupon.max_uses_per_customer ? String(coupon.max_uses_per_customer) : "");
    setFormValidFrom(coupon.valid_from ? coupon.valid_from.split("T")[0] : "");
    setFormValidUntil(coupon.valid_until ? coupon.valid_until.split("T")[0] : "");
    setFormIsActive(coupon.is_active);
    setDialogOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!formCode.trim()) {
      toast.error("Digite o código do cupom");
      return;
    }

    // Free shipping doesn't need a discount value, but combined and delivery_discount do
    if (formDiscountType !== "free_shipping") {
      if (!formDiscountValue || parseFloat(formDiscountValue) <= 0) {
        toast.error("Digite um valor de desconto válido");
        return;
      }

      // Validate percentage for percentage, combined, and delivery_discount types
      if ((formDiscountType === "percentage" || formDiscountType === "combined" || formDiscountType === "delivery_discount") && parseFloat(formDiscountValue) > 100) {
        toast.error("Porcentagem não pode ser maior que 100%");
        return;
      }
    }

    setSaving(true);
    try {
      const couponData = {
        store_id: store.id,
        code: formCode.toUpperCase().trim(),
        description: formDescription.trim() || null,
        discount_type: formDiscountType,
        discount_value: formDiscountType === "free_shipping" ? 0 : parseFloat(formDiscountValue),
        min_order_value: formMinOrderValue ? parseFloat(formMinOrderValue) : 0,
        max_uses: formMaxUses ? parseInt(formMaxUses) : null,
        max_uses_per_customer: formMaxUsesPerCustomer ? parseInt(formMaxUsesPerCustomer) : null,
        valid_from: formValidFrom || null,
        valid_until: formValidUntil || null,
        is_active: formIsActive,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);
          
        if (error) throw error;
        toast.success("Cupom atualizado!");
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert(couponData);
          
        if (error) {
          if (error.code === "23505") {
            toast.error("Já existe um cupom com esse código");
            return;
          }
          throw error;
        }
        toast.success("Cupom criado!");
      }

      setDialogOpen(false);
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`Deseja excluir o cupom "${coupon.code}"?`)) return;
    
    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", coupon.id);
        
      if (error) throw error;
      toast.success("Cupom excluído!");
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);
        
      if (error) throw error;
      
      setCoupons(prev => 
        prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)
      );
      
      toast.success(coupon.is_active ? "Cupom desativado" : "Cupom ativado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: "Inativo", variant: "secondary" as const };
    
    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { label: "Expirado", variant: "destructive" as const };
    }
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { label: "Agendado", variant: "outline" as const };
    }
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return { label: "Esgotado", variant: "destructive" as const };
    }
    
    return { label: "Ativo", variant: "default" as const };
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "free_shipping") {
      return "Frete Grátis";
    }
    if (coupon.discount_type === "combined") {
      return `${coupon.discount_value}% + Frete Grátis`;
    }
    if (coupon.discount_type === "delivery_discount") {
      return `${coupon.discount_value}% OFF no Frete`;
    }
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Cupons de Desconto</h1>
          <p className="text-[11px] text-muted-foreground">{coupons.length} cupons cadastrados</p>
        </div>
        <Button onClick={openNewCouponDialog} size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Novo Cupom
        </Button>
      </div>

      {/* Tabs for Coupons and Reports */}
      <Tabs defaultValue="coupons" className="w-full">
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="coupons" className="text-xs h-7 gap-1.5">
            <TicketPercent className="w-3.5 h-3.5" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs h-7 gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-4">
          {/* Coupons List */}
          {coupons.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <TicketPercent className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado</p>
              <Button onClick={openNewCouponDialog} size="sm" className="mt-3 h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Criar primeiro cupom
              </Button>
            </div>
          ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon, index) => {
            const status = getCouponStatus(coupon);
            return (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg p-3 space-y-2"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className="font-mono text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                    >
                      {coupon.code}
                      {copiedCode === coupon.code ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditCouponDialog(coupon)} className="text-xs">
                        <Edit className="w-3.5 h-3.5 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive text-xs"
                        onClick={() => handleDeleteCoupon(coupon)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Discount */}
                <div className={`text-lg font-bold ${coupon.discount_type === 'free_shipping' || coupon.discount_type === 'combined' || coupon.discount_type === 'delivery_discount' ? 'text-green-600' : 'text-primary'}`}>
                  {coupon.discount_type === 'free_shipping' ? '🚚 ' : coupon.discount_type === 'combined' ? '🎁 ' : coupon.discount_type === 'delivery_discount' ? '🚚 ' : '-'}{formatDiscount(coupon)}
                </div>

                {/* Description */}
                {coupon.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {coupon.description}
                  </p>
                )}

                {/* Details */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {coupon.min_order_value && coupon.min_order_value > 0 && (
                    <Badge variant="outline">
                      Mín. R$ {coupon.min_order_value.toFixed(2)}
                    </Badge>
                  )}
                  {coupon.max_uses && (
                    <Badge variant="outline">
                      {coupon.uses_count}/{coupon.max_uses} usos
                    </Badge>
                  )}
                </div>

                {/* Validity */}
                {(coupon.valid_from || coupon.valid_until) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {coupon.valid_from && format(new Date(coupon.valid_from), "dd/MM/yyyy", { locale: ptBR })}
                    {coupon.valid_from && coupon.valid_until && " - "}
                    {coupon.valid_until && format(new Date(coupon.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}

                {/* Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    {coupon.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={() => toggleActive(coupon)}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <CouponUsageReport storeId={store.id} />
        </TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code */}
            <div className="space-y-2">
              <Label>Código do Cupom *</Label>
              <Input
                placeholder="Ex: PROMO10, DESCONTO20"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Código que o cliente vai digitar no checkout
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição do cupom (opcional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto *</Label>
                <Select value={formDiscountType} onValueChange={(value) => {
                  setFormDiscountType(value);
                  if (value === "free_shipping") {
                    setFormDiscountValue("0");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="free_shipping">🚚 Frete Grátis</SelectItem>
                    <SelectItem value="delivery_discount">🚚 Desconto no Frete (%)</SelectItem>
                    <SelectItem value="combined">🎁 Desconto + Frete Grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formDiscountType !== "free_shipping" && (
                <div className="space-y-2">
                  <Label>Valor do Desconto *</Label>
                  <Input
                    type="number"
                    placeholder={formDiscountType === "percentage" ? "10" : "15.00"}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    min="0"
                    step={formDiscountType === "percentage" ? "1" : "0.01"}
                  />
                </div>
              )}
            </div>

            {formDiscountType === "free_shipping" && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-600 font-medium">
                  🚚 Este cupom dará frete grátis ao cliente
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  A taxa de entrega será zerada automaticamente no checkout
                </p>
              </div>
            )}

            {formDiscountType === "delivery_discount" && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-600 font-medium">
                  🚚 Este cupom dará desconto no frete
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O cliente receberá {formDiscountValue ? `${formDiscountValue}%` : "X%"} de desconto na taxa de entrega
                </p>
              </div>
            )}

            {formDiscountType === "combined" && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-600 font-medium">
                  🎁 Este cupom dará desconto + frete grátis
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O cliente receberá {formDiscountValue ? `${formDiscountValue}%` : "X%"} de desconto e frete grátis
                </p>
              </div>
            )}

            {/* Min Order & Max Uses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Mínimo do Pedido</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formMinOrderValue}
                  onChange={(e) => setFormMinOrderValue(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Total de Usos</Label>
                <Input
                  type="number"
                  placeholder="Ilimitado"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            {/* Per Customer Limit */}
            <div className="space-y-2">
              <Label>Limite de Usos por Cliente (telefone)</Label>
              <Input
                type="number"
                placeholder="Ilimitado"
                value={formMaxUsesPerCustomer}
                onChange={(e) => setFormMaxUsesPerCustomer(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Quantas vezes cada cliente (por telefone) pode usar este cupom
              </p>
            </div>

            {/* Validity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Válido a partir de</Label>
                <Input
                  type="date"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <Label>Cupom ativo</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCoupon} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
