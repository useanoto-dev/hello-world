// Customers Management - Anotô SaaS
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Phone, Mail, MapPin, ShoppingBag, 
  ChevronDown, ChevronUp, Calendar, DollarSign, StickyNote, Pencil, Star, MessageSquare, Gift, Filter, X, MessageCircle, History, Send, Megaphone, Trash2, MoreVertical, UserCog
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ReviewsManager } from "@/components/admin/ReviewsManager";
import { LoyaltyManager } from "@/components/admin/LoyaltyManager";
import { BroadcastWizard } from "@/components/admin/BroadcastWizard";
import { CampaignHistory } from "@/components/admin/CampaignHistory";

interface WhatsAppTemplate {
  id: string;
  template_key: string;
  label: string;
  emoji: string;
  message_template: string;
  is_active: boolean;
}

interface WhatsAppMessage {
  id: string;
  template_key: string;
  message_content: string;
  sent_at: string;
}

interface CustomerReview {
  id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: any;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  review?: CustomerReview | null;
  cpf?: string | null;
  loyalty_points?: number | null;
  loyalty_tier?: string | null;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: number;
  items: OrderItem[];
  total: number;
  order_type: string;
  status: string;
  created_at: string;
}

export default function CustomersPage() {
  const { store } = useOutletContext<{ store: any }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Customer | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  
  // WhatsApp CRM state
  const [whatsappCustomer, setWhatsappCustomer] = useState<Customer | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [customerMessages, setCustomerMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessagesHistory, setShowMessagesHistory] = useState<Customer | null>(null);
  
  // Broadcast Wizard state
  const [showBroadcastWizard, setShowBroadcastWizard] = useState(false);
  
  // Edit/Delete customer state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [deletingCustomerLoading, setDeletingCustomerLoading] = useState(false);
  
  // Filters state
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [spentFilter, setSpentFilter] = useState<string>("all");
  const [ordersFilter, setOrdersFilter] = useState<string>("all");

  useEffect(() => {
    if (store?.id) {
      loadCustomers();
      loadWhatsAppTemplates();
    }
  }, [store?.id]);

  const loadWhatsAppTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setWhatsappTemplates((data || []) as WhatsAppTemplate[]);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadCustomerMessages = async (customer: Customer) => {
    setShowMessagesHistory(customer);
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("store_id", store.id)
        .eq("customer_id", customer.id)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCustomerMessages((data || []) as WhatsAppMessage[]);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadCustomers = async () => {
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("store_id", store.id)
        .order("last_order_at", { ascending: false, nullsFirst: false });
        
      if (customersError) throw customersError;

      // Fetch all reviews for this store
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("store_id", store.id);

      // Fetch loyalty points data (CPF, points, tier)
      const { data: loyaltyData } = await supabase
        .from("customer_points")
        .select("customer_phone, customer_cpf, total_points, tier")
        .eq("store_id", store.id);

      // Map reviews to customers by phone
      const reviewsByPhone = new Map<string, CustomerReview>();
      reviewsData?.forEach(r => {
        reviewsByPhone.set(r.customer_phone, {
          id: r.id,
          rating: r.rating,
          feedback: r.feedback,
          created_at: r.created_at,
          updated_at: r.updated_at
        });
      });

      // Map loyalty data to customers by phone
      const loyaltyByPhone = new Map<string, { cpf: string | null; points: number; tier: string }>();
      loyaltyData?.forEach(l => {
        loyaltyByPhone.set(l.customer_phone, {
          cpf: l.customer_cpf,
          points: l.total_points,
          tier: l.tier
        });
      });

      // Combine customers with their reviews and loyalty data
      const customersWithData = (customersData || []).map(c => {
        const loyalty = loyaltyByPhone.get(c.phone);
        return {
          ...c,
          review: reviewsByPhone.get(c.phone) || null,
          cpf: loyalty?.cpf || null,
          loyalty_points: loyalty?.points || null,
          loyalty_tier: loyalty?.tier || null
        };
      });

      setCustomers(customersWithData);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerOrders = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .eq("customer_phone", customer.phone)
        .order("created_at", { ascending: false })
        .limit(20);
        
      if (error) throw error;
      setCustomerOrders((data || []).map(o => ({
        ...o,
        items: (o.items as unknown as OrderItem[]) || []
      })));
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const openNotesEditor = (customer: Customer) => {
    setEditingNotes(customer);
    setNotesText(customer.notes || "");
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || ""
    });
  };

  const saveCustomer = async () => {
    if (!editingCustomer) return;
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    
    setSavingCustomer(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || null
        })
        .eq("id", editingCustomer.id);
        
      if (error) throw error;
      
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, name: editForm.name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim() || null } 
          : c
      ));
      setEditingCustomer(null);
      toast.success("Cliente atualizado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    } finally {
      setSavingCustomer(false);
    }
  };

  const deleteCustomer = async () => {
    if (!deletingCustomer) return;
    
    setDeletingCustomerLoading(true);
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", deletingCustomer.id);
        
      if (error) throw error;
      
      setCustomers(prev => prev.filter(c => c.id !== deletingCustomer.id));
      setDeletingCustomer(null);
      setExpandedCustomer(null);
      toast.success("Cliente excluído!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    } finally {
      setDeletingCustomerLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!editingNotes) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ notes: notesText.trim() || null })
        .eq("id", editingNotes.id);
        
      if (error) throw error;
      
      setCustomers(prev => prev.map(c => 
        c.id === editingNotes.id ? { ...c, notes: notesText.trim() || null } : c
      ));
      setEditingNotes(null);
      toast.success("Observação salva!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSavingNotes(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search) ||
      (customer.email?.toLowerCase().includes(searchLower) ?? false);
    
    if (!matchesSearch) return false;
    
    // Period filter
    if (periodFilter !== "all" && customer.last_order_at) {
      const lastOrderDate = new Date(customer.last_order_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (periodFilter) {
        case "7days":
          if (daysDiff > 7) return false;
          break;
        case "30days":
          if (daysDiff > 30) return false;
          break;
        case "90days":
          if (daysDiff > 90) return false;
          break;
        case "inactive":
          if (daysDiff <= 30) return false;
          break;
      }
    } else if (periodFilter === "inactive" && !customer.last_order_at) {
      // Consider customers without orders as inactive
    } else if (periodFilter !== "all" && !customer.last_order_at) {
      return false;
    }
    
    // Spent filter
    if (spentFilter !== "all") {
      switch (spentFilter) {
        case "under100":
          if (customer.total_spent >= 100) return false;
          break;
        case "100to500":
          if (customer.total_spent < 100 || customer.total_spent >= 500) return false;
          break;
        case "500to1000":
          if (customer.total_spent < 500 || customer.total_spent >= 1000) return false;
          break;
        case "over1000":
          if (customer.total_spent < 1000) return false;
          break;
      }
    }
    
    // Orders filter
    if (ordersFilter !== "all") {
      switch (ordersFilter) {
        case "1order":
          if (customer.total_orders !== 1) return false;
          break;
        case "2to5":
          if (customer.total_orders < 2 || customer.total_orders > 5) return false;
          break;
        case "6to10":
          if (customer.total_orders < 6 || customer.total_orders > 10) return false;
          break;
        case "over10":
          if (customer.total_orders <= 10) return false;
          break;
      }
    }
    
    return true;
  });
  
  const activeFiltersCount = [periodFilter, spentFilter, ordersFilter].filter(f => f !== "all").length;
  
  const clearFilters = () => {
    setPeriodFilter("all");
    setSpentFilter("all");
    setOrdersFilter("all");
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      preparing: "Preparando",
      ready: "Pronto",
      delivering: "Em entrega",
      completed: "Concluído",
      canceled: "Cancelado"
    };
    return labels[status] || status;
  };

  // Fallback templates if none loaded from DB
  const defaultMessageTemplates = [
    { id: "promo", label: "Promoção", emoji: "🎉", message_template: "Olá {nome}! 🍕\n\nTemos uma promoção especial para você! Confira nosso cardápio e aproveite os descontos exclusivos.\n\nAguardamos seu pedido! 🚀" },
    { id: "comeback", label: "Retorno", emoji: "🔄", message_template: "Olá {nome}! 👋\n\nSentimos sua falta! Faz um tempo que você não nos visita.\n\nQue tal matar a saudade com um pedido especial? Estamos te esperando! 😋" },
    { id: "thanks", label: "Agradecimento", emoji: "💛", message_template: "Olá {nome}! 😊\n\nGostaríamos de agradecer pela sua preferência!\n\nSua satisfação é muito importante para nós. Conte sempre conosco! 🙏" },
    { id: "feedback", label: "Feedback", emoji: "⭐", message_template: "Olá {nome}! 🌟\n\nGostou do seu último pedido?\n\nQueremos saber sua opinião para continuar melhorando. Nos conte como foi sua experiência! 📝" },
    { id: "loyalty", label: "Fidelidade", emoji: "🎁", message_template: "Olá {nome}! 🎉\n\nVocê é um cliente especial!\n\nAproveite seus pontos de fidelidade no próximo pedido e ganhe benefícios exclusivos. Confira! 🏆" },
    { id: "custom", label: "Personalizado", emoji: "✏️", message_template: "Olá {nome}!\n\n" }
  ];

  const getActiveTemplates = () => {
    if (whatsappTemplates.length > 0) {
      return whatsappTemplates.map(t => ({
        id: t.template_key,
        label: t.label,
        emoji: t.emoji,
        message_template: t.message_template
      }));
    }
    return defaultMessageTemplates;
  };

  const sendWhatsApp = async (customer: Customer, templateId: string) => {
    const templates = getActiveTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    const firstName = customer.name.split(" ")[0];
    const message = template.message_template.replace(/{nome}/gi, firstName);
    const phone = customer.phone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    
    // Save to message history
    try {
      await supabase.from("whatsapp_messages").insert({
        store_id: store.id,
        customer_id: customer.id,
        customer_phone: customer.phone,
        template_key: templateId,
        message_content: message
      });
    } catch (error) {
      console.error("Error saving message history:", error);
    }
    
    window.open(whatsappUrl, "_blank");
    setWhatsappCustomer(null);
    toast.success("Mensagem enviada!");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold">Clientes & Avaliações</h1>
        <p className="text-[11px] text-muted-foreground">
          Gerencie clientes e avaliações
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="customers" className="text-xs h-7 gap-1.5 px-3">
            <Users className="w-3.5 h-3.5" />
            Clientes ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs h-7 gap-1.5 px-3">
            <MessageSquare className="w-3.5 h-3.5" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="text-xs h-7 gap-1.5 px-3">
            <Gift className="w-3.5 h-3.5" />
            Fidelidade
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs h-7 gap-1.5 px-3">
            <Megaphone className="w-3.5 h-3.5" />
            Campanhas
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    {activeFiltersCount} filtro(s)
                    <X className="w-3 h-3" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={() => setShowBroadcastWizard(true)}
                  className="gap-2"
                >
                  <Megaphone className="w-4 h-4" />
                  Criar Disparo
                  {filteredCustomers.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {filteredCustomers.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap gap-2">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <Calendar className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="inactive">Inativos (+30 dias)</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={spentFilter} onValueChange={setSpentFilter}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <DollarSign className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Valor gasto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer valor</SelectItem>
                  <SelectItem value="under100">Até R$ 100</SelectItem>
                  <SelectItem value="100to500">R$ 100 - R$ 500</SelectItem>
                  <SelectItem value="500to1000">R$ 500 - R$ 1.000</SelectItem>
                  <SelectItem value="over1000">Acima de R$ 1.000</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={ordersFilter} onValueChange={setOrdersFilter}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <ShoppingBag className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Nº de pedidos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1order">1 pedido</SelectItem>
                  <SelectItem value="2to5">2 a 5 pedidos</SelectItem>
                  <SelectItem value="6to10">6 a 10 pedidos</SelectItem>
                  <SelectItem value="over10">+10 pedidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Results count */}
            {(search || activeFiltersCount > 0) && (
              <p className="text-sm text-muted-foreground">
                {filteredCustomers.length} de {customers.length} clientes
              </p>
            )}
          </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Os clientes são adicionados automaticamente quando fazem pedidos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredCustomers.map((customer, index) => {
              const isExpanded = expandedCustomer === customer.id;
              
              return (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {/* Customer Header - Compact */}
                  <div 
                    className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                  >
                    {/* WhatsApp Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] hover:text-[#128C7E] flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWhatsappCustomer(customer);
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{customer.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(customer.phone)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="hidden sm:flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        {customer.total_orders}
                      </span>
                      <span className="font-medium text-foreground">
                        R$ {customer.total_spent.toFixed(2)}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Customer Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          {/* Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-muted/50 p-2 rounded-md">
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                                <ShoppingBag className="w-3 h-3" />
                                Pedidos
                              </div>
                              <p className="font-semibold text-sm">{customer.total_orders}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded-md">
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                                <DollarSign className="w-3 h-3" />
                                Total Gasto
                              </div>
                              <p className="font-semibold text-sm">R$ {customer.total_spent.toFixed(2)}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded-md">
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                                <Calendar className="w-3 h-3" />
                                Cliente desde
                              </div>
                              <p className="font-semibold text-sm">
                                {format(new Date(customer.created_at), "dd/MM/yy")}
                              </p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded-md">
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                                <Calendar className="w-3 h-3" />
                                Último Pedido
                              </div>
                              <p className="font-semibold text-sm">
                                {customer.last_order_at 
                                  ? format(new Date(customer.last_order_at), "dd/MM/yy")
                                  : "-"
                                }
                              </p>
                            </div>
                          </div>

                          {/* CPF and Loyalty Info */}
                          {(customer.cpf || customer.loyalty_points !== null) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {customer.cpf && (
                                <div className="flex items-center gap-2 text-xs bg-blue-500/10 border border-blue-500/20 p-2 rounded-md">
                                  <Users className="w-3 h-3 text-blue-600" />
                                  <div>
                                    <p className="text-[10px] text-blue-600 font-medium">CPF</p>
                                    <p className="font-mono text-foreground text-xs">
                                      {customer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {customer.loyalty_points !== null && customer.loyalty_points > 0 && (
                                <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 p-2 rounded-md">
                                  <Gift className="w-3 h-3 text-amber-600" />
                                  <div>
                                    <p className="text-[10px] text-amber-600 font-medium">
                                      Fidelidade • {customer.loyalty_tier?.charAt(0).toUpperCase()}{customer.loyalty_tier?.slice(1)}
                                    </p>
                                    <p className="font-semibold text-foreground text-xs">{customer.loyalty_points} pts</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Address */}
                          {customer.address && (
                            <div className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded-md">
                              <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                              <span>
                                {customer.address.street}, {customer.address.number}
                                {customer.address.complement && ` - ${customer.address.complement}`}
                                <br />
                                {customer.address.neighborhood} - {customer.address.city}
                              </span>
                            </div>
                          )}

                          {/* Review */}
                          {customer.review && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-yellow-600 text-xs font-medium">
                                  <Star className="w-3 h-3 fill-yellow-500" />
                                  Avaliação
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= customer.review!.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-muted-foreground/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {customer.review.feedback && (
                                <p className="text-xs text-foreground italic">"{customer.review.feedback}"</p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(customer.review.created_at), "dd/MM/yy")}
                              </p>
                            </div>
                          )}

                          {/* Notes */}
                          <div className="bg-muted/50 p-2 rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <StickyNote className="w-3 h-3" />
                                Observações
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => openNotesEditor(customer)}
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                            </div>
                            {customer.notes ? (
                              <p className="text-xs">{customer.notes}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                Nenhuma observação
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 flex-wrap">
                            <Button
                              variant="outline"
                              className="flex-1 min-w-[100px]"
                              onClick={() => loadCustomerOrders(customer)}
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Pedidos
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => loadCustomerMessages(customer)}
                            >
                              <History className="w-4 h-4 mr-2" />
                              Histórico
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => window.open(`https://wa.me/55${customer.phone.replace(/\D/g, '')}`, '_blank')}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            
                            {/* Dropdown Menu for Edit/Delete */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditCustomer(customer)}>
                                  <UserCog className="w-4 h-4 mr-2" />
                                  Editar Cliente
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeletingCustomer(customer)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir Cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
        )}

        {/* Orders Modal */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Pedidos de {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            
            {loadingOrders ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : customerOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhum pedido encontrado
              </p>
            ) : (
              <div className="space-y-3">
                {customerOrders.map(order => (
                  <div key={order.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold">#{order.order_number}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {order.items.map((item, i) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {order.order_type === "delivery" ? "🛵 Delivery" : 
                         order.order_type === "pickup" ? "🏪 Retirada" : "🍽️ Mesa"}
                      </span>
                      <span className="font-bold">R$ {order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Notes Editor Modal */}
        <Dialog open={!!editingNotes} onOpenChange={() => setEditingNotes(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StickyNote className="w-5 h-5" />
                Observações - {editingNotes?.name}
              </DialogTitle>
            </DialogHeader>
            
            <Textarea
              placeholder="Adicione observações internas sobre este cliente (preferências, alergias, informações especiais...)"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={5}
              className="resize-none"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingNotes(null)}>
                Cancelar
              </Button>
              <Button onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Message Template Modal */}
        <Dialog open={!!whatsappCustomer} onOpenChange={() => setWhatsappCustomer(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                Enviar WhatsApp
              </DialogTitle>
            </DialogHeader>
            
            {whatsappCustomer && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Escolha o tipo de mensagem para <span className="font-medium text-foreground">{whatsappCustomer.name}</span>:
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      loadCustomerMessages(whatsappCustomer);
                      setWhatsappCustomer(null);
                    }}
                    className="text-xs gap-1"
                  >
                    <History className="w-3 h-3" />
                    Histórico
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {getActiveTemplates().map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="h-auto py-3 px-3 flex flex-col items-center gap-1 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-700"
                      onClick={() => sendWhatsApp(whatsappCustomer, template.id)}
                    >
                      <span className="text-lg">{template.emoji}</span>
                      <span className="text-xs">{template.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* WhatsApp Message History Modal */}
        <Dialog open={!!showMessagesHistory} onOpenChange={() => setShowMessagesHistory(null)}>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-green-600" />
                Histórico de Mensagens - {showMessagesHistory?.name}
              </DialogTitle>
            </DialogHeader>
            
            {loadingMessages ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : customerMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma mensagem enviada ainda</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {customerMessages.map((msg) => {
                    const template = getActiveTemplates().find(t => t.id === msg.template_key);
                    return (
                      <div key={msg.id} className="bg-muted/50 p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {template?.emoji} {template?.label || msg.template_key}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                          {msg.message_content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <ReviewsManager storeId={store?.id} />
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty">
          <LoyaltyManager storeId={store?.id} />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <CampaignHistory storeId={store?.id || ""} />
        </TabsContent>
      </Tabs>

      {/* Broadcast Wizard */}
      <BroadcastWizard
        open={showBroadcastWizard}
        onClose={() => setShowBroadcastWizard(false)}
        storeId={store?.id || ""}
        customers={filteredCustomers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          total_orders: c.total_orders,
          total_spent: c.total_spent
        }))}
        filters={{
          period: periodFilter,
          spent: spentFilter,
          orders: ordersFilter
        }}
      />

      {/* Edit Customer Modal */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone *</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCustomer(null)}>
              Cancelar
            </Button>
            <Button onClick={saveCustomer} disabled={savingCustomer}>
              {savingCustomer ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingCustomer?.name}</strong>?
              Esta ação não pode ser desfeita. O histórico de pedidos será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCustomerLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteCustomer} 
              disabled={deletingCustomerLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCustomerLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
