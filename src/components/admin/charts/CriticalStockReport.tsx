// Critical Stock Report - Analytics Dashboard
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, Box } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CriticalStockReportProps {
  storeId: string | undefined;
}

interface StockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_alert: number;
  source: 'menu' | 'inventory';
  category_name?: string;
}

export function CriticalStockReport({ storeId }: CriticalStockReportProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fetch products with stock control from both menu and inventory
  const { data: stockProducts = [], isLoading } = useQuery({
    queryKey: ["critical-stock-products", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      // Fetch menu products with stock control
      const [menuResult, inventoryResult] = await Promise.all([
        supabase
          .from("products")
          .select(`
            id,
            name,
            stock_quantity,
            min_stock_alert,
            category:categories(name)
          `)
          .eq("store_id", storeId)
          .eq("has_stock_control", true)
          .eq("is_available", true),
        supabase
          .from("inventory_products")
          .select(`
            id,
            name,
            stock_quantity,
            min_stock_alert,
            category:inventory_categories(name)
          `)
          .eq("store_id", storeId)
          .eq("is_active", true)
      ]);

      const menuProducts: StockProduct[] = (menuResult.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        stock_quantity: p.stock_quantity || 0,
        min_stock_alert: p.min_stock_alert || 5,
        source: 'menu' as const,
        category_name: p.category?.name || 'Sem categoria'
      }));

      const inventoryProducts: StockProduct[] = (inventoryResult.data || []).map((p: any) => ({
        id: `inv-${p.id}`,
        name: p.name,
        stock_quantity: p.stock_quantity || 0,
        min_stock_alert: p.min_stock_alert || 5,
        source: 'inventory' as const,
        category_name: p.category?.name || 'Sem categoria'
      }));

      return [...menuProducts, ...inventoryProducts];
    },
    enabled: !!storeId,
    staleTime: 60 * 1000, // 1 min
  });

  // Calculate stats
  const criticalProducts = stockProducts.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0);
  const outOfStockProducts = stockProducts.filter(p => p.stock_quantity === 0);
  const healthyProducts = stockProducts.filter(p => p.stock_quantity > p.min_stock_alert);
  
  const chartData = [
    { name: 'OK', value: healthyProducts.length, color: isDark ? '#22c55e' : 'hsl(var(--success))' },
    { name: 'Baixo', value: criticalProducts.length, color: '#f59e0b' },
    { name: 'Esgotado', value: outOfStockProducts.length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Sort by urgency (out of stock first, then by how close to zero)
  const sortedCritical = [...criticalProducts, ...outOfStockProducts].sort((a, b) => {
    if (a.stock_quantity === 0 && b.stock_quantity !== 0) return -1;
    if (a.stock_quantity !== 0 && b.stock_quantity === 0) return 1;
    return a.stock_quantity - b.stock_quantity;
  });

  if (isLoading) {
    return (
      <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stockProducts.length === 0) {
    return (
      <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Controle de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-center py-6 text-muted-foreground">
            <Box className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum produto com controle de estoque</p>
            <p className="text-xs mt-1">Ative o controle de estoque nos produtos para ver este relatório</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasProblems = criticalProducts.length > 0 || outOfStockProducts.length > 0;

  return (
    <div className="space-y-3">
      {/* Stock Overview Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">OK</p>
            <p className="text-lg font-bold text-success">{healthyProducts.length}</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Baixo</p>
            <p className="text-lg font-bold text-amber-500">{criticalProducts.length}</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Esgotado</p>
            <p className="text-lg font-bold text-destructive">{outOfStockProducts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Distribuição de Estoque</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDark ? "#1f1f1f" : "#fff",
                      border: isDark ? "1px solid #333" : "1px solid #eee",
                      borderRadius: 8,
                      fontSize: 10,
                    }}
                    formatter={(value: number) => [`${value} produto(s)`, ""]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Products List */}
      {hasProblems && (
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06]">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Produtos que precisam de atenção
            </CardTitle>
            <CardDescription className="text-[9px]">
              {sortedCritical.length} produto(s) com estoque baixo ou esgotado
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {sortedCritical.slice(0, 10).map((product) => {
                const isOutOfStock = product.stock_quantity === 0;
                const percentage = product.min_stock_alert > 0 
                  ? Math.round((product.stock_quantity / product.min_stock_alert) * 100) 
                  : 0;

                return (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{product.name}</p>
                        <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">
                          {product.source === 'inventory' ? 'Estoque' : 'Cardápio'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{product.category_name}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stock Bar */}
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${isOutOfStock ? 'bg-destructive' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      
                      <Badge 
                        variant={isOutOfStock ? "destructive" : "secondary"} 
                        className="text-[10px] px-1.5 py-0 min-w-[40px] justify-center"
                      >
                        {product.stock_quantity}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              
              {sortedCritical.length > 10 && (
                <p className="text-[10px] text-center text-muted-foreground pt-2">
                  +{sortedCritical.length - 10} outros produtos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {!hasProblems && (
        <Card className="dark:bg-white/[0.03] dark:border-white/[0.06] border-success/30">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm font-medium text-success">Estoque saudável!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os {stockProducts.length} produtos estão com estoque adequado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
