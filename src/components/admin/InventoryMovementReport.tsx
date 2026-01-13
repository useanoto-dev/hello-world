import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  ShoppingCart,
  Package,
  CalendarIcon,
  Download,
  ArrowLeft,
  Filter,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryProduct {
  id: string;
  name: string;
  unit: string;
  promotional_price: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
}

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  order_id: string | null;
  product_id: string;
  product_name?: string;
  product_unit?: string;
}

interface InventoryMovementReportProps {
  storeId: string;
  onBack: () => void;
}

const MOVEMENT_TYPES = [
  { value: "all", label: "Todos os tipos" },
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "venda", label: "Venda" },
  { value: "ajuste", label: "Ajuste" },
];

const PERIOD_PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "custom", label: "Personalizado" },
];

export default function InventoryMovementReport({
  storeId,
  onBack,
}: InventoryMovementReportProps) {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  
  // Filters
  const [periodPreset, setPeriodPreset] = useState("month");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [movementType, setMovementType] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [promotionFilter, setPromotionFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [storeId]);

  useEffect(() => {
    if (products.length > 0 || selectedProduct !== "all" || promotionFilter === "all") {
      loadMovements();
    }
  }, [storeId, startDate, endDate, movementType, selectedProduct, promotionFilter, products]);

  useEffect(() => {
    const now = new Date();
    switch (periodPreset) {
      case "today":
        setStartDate(new Date(now.setHours(0, 0, 0, 0)));
        setEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
        break;
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo);
        setEndDate(new Date());
        break;
      case "month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
    }
  }, [periodPreset]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_products")
        .select("id, name, unit, promotional_price, promotion_start_at, promotion_end_at")
        .eq("store_id", storeId)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  // Helper to check if product is currently on promotion
  const isProductOnPromotion = (product: InventoryProduct) => {
    if (!product.promotional_price) return false;
    const now = new Date();
    const start = product.promotion_start_at ? new Date(product.promotion_start_at) : null;
    const end = product.promotion_end_at ? new Date(product.promotion_end_at) : null;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  // Get filtered products for movements based on promotion filter
  const getFilteredProductIds = () => {
    if (promotionFilter === "all") return null;
    
    const filtered = products.filter(p => {
      const isOnPromo = isProductOnPromotion(p);
      return promotionFilter === "promo" ? isOnPromo : !isOnPromo;
    });
    
    return filtered.map(p => p.id);
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const filteredProductIds = getFilteredProductIds();
      
      // If promotion filter is active but no products match, return empty
      if (filteredProductIds !== null && filteredProductIds.length === 0) {
        setMovements([]);
        setLoading(false);
        return;
      }

      // Fetch movements without join (schema cache may not have FK yet)
      let query = supabase
        .from("inventory_movements")
        .select("*")
        .eq("store_id", storeId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (movementType !== "all") {
        query = query.eq("movement_type", movementType);
      }

      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      } else if (filteredProductIds !== null) {
        query = query.in("product_id", filteredProductIds);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      // Create a map of products for quick lookup
      const productMap = new Map(products.map(p => [p.id, p]));

      // Manually join product data
      const formattedData = (data || []).map((m: any) => {
        const product = productMap.get(m.product_id);
        return {
          ...m,
          product_name: product?.name || "Produto removido",
          product_unit: product?.unit || "un",
        };
      });

      setMovements(formattedData);
    } catch (error) {
      console.error("Error loading movements:", error);
      toast.error("Erro ao carregar movimentações");
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
      case "saida":
        return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
      case "sale":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "ajuste":
        return <RefreshCw className="w-4 h-4 text-amber-500" />;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "entrada":
        return { label: "Entrada", variant: "default" as const };
      case "saida":
        return { label: "Saída", variant: "destructive" as const };
      case "venda":
        return { label: "Venda", variant: "secondary" as const };
      case "ajuste":
        return { label: "Ajuste", variant: "outline" as const };
      default:
        return { label: type, variant: "secondary" as const };
    }
  };

  const exportToCSV = () => {
    if (movements.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = [
      "Data/Hora",
      "Produto",
      "Tipo",
      "Quantidade",
      "Estoque Anterior",
      "Estoque Novo",
      "Motivo",
      "Responsável",
    ];

    const rows = movements.map((m) => [
      format(new Date(m.created_at), "dd/MM/yyyy HH:mm"),
      m.product_name || "",
      getMovementLabel(m.movement_type).label,
      m.quantity.toString(),
      m.previous_stock.toString(),
      m.new_stock.toString(),
      m.reason || "",
      m.created_by || "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimentacoes_estoque_${format(startDate, "dd-MM-yyyy")}_a_${format(endDate, "dd-MM-yyyy")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Relatório exportado com sucesso!");
  };

  const clearFilters = () => {
    setPeriodPreset("month");
    setMovementType("all");
    setSelectedProduct("all");
    setPromotionFilter("all");
  };

  const hasActiveFilters = movementType !== "all" || selectedProduct !== "all" || periodPreset !== "month" || promotionFilter !== "all";

  // Summary stats
  const totalEntradas = movements
    .filter((m) => m.movement_type === "entrada")
    .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const totalSaidas = movements
    .filter((m) => m.movement_type === "saida" || m.movement_type === "venda")
    .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const totalAjustes = movements.filter((m) => m.movement_type === "ajuste").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Histórico de Movimentações</h2>
            <p className="text-sm text-muted-foreground">
              Relatório completo de entradas, saídas e ajustes de estoque
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportToCSV}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="w-3 h-3" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Period Preset */}
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={periodPreset} onValueChange={setPeriodPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {periodPreset === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(startDate, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(endDate, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* Movement Type */}
              <div className="space-y-2">
                <Label>Tipo de Movimento</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Promotion Filter */}
              <div className="space-y-2">
                <Label>Promoção</Label>
                <Select value={promotionFilter} onValueChange={setPromotionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="promo">Em promoção</SelectItem>
                    <SelectItem value="no_promo">Sem promoção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">+{totalEntradas}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Saídas/Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">-{totalSaidas}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ajustes Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">{totalAjustes}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Movimentações ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros ou período
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Novo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => {
                    const { label, variant } = getMovementLabel(movement.movement_type);
                    const isIncrease = movement.new_stock > movement.previous_stock;

                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(movement.created_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {movement.product_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.movement_type)}
                            <Badge variant={variant} className="text-xs">
                              {label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            isIncrease ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isIncrease ? "+" : "-"}{Math.abs(movement.quantity)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {movement.previous_stock}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {movement.new_stock}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {movement.reason || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
