// Página de Gestão de Estoque
import { useState, useEffect } from "react";
import { Plus, Package, AlertTriangle, FolderOpen, TrendingDown, TrendingUp, BarChart3, ShoppingBag, History, Edit, CheckSquare, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryManager from "@/components/admin/InventoryManager";
import InventoryCategoriesTab from "@/components/admin/InventoryCategoriesTab";
import InventoryMovementReport from "@/components/admin/InventoryMovementReport";

interface InventoryCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface InventoryProduct {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  category_id: string;
}

interface MenuProduct {
  id: string;
  name: string;
  image_url: string | null;
  stock_quantity: number;
  min_stock_alert: number;
  unit: string;
  is_available: boolean;
  category_name?: string;
}

interface StatsData {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCategories: number;
  menuProductsWithStock: number;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [stats, setStats] = useState<StatsData>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalCategories: 0,
    menuProductsWithStock: 0,
  });
  
  // Stock adjustment modal
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedMenuProduct, setSelectedMenuProduct] = useState<MenuProduct | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Batch adjustment state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [batchAdjustmentOpen, setBatchAdjustmentOpen] = useState(false);
  const [batchAdjustmentType, setBatchAdjustmentType] = useState<'add' | 'remove'>('add');
  const [batchAdjustmentQty, setBatchAdjustmentQty] = useState('');
  const [batchAdjustmentReason, setBatchAdjustmentReason] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);

  useEffect(() => {
    loadStoreAndData();
  }, []);

  const loadStoreAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.store_id) throw new Error("Loja não encontrada");

      setStoreId(profile.store_id);
      await loadData(profile.store_id);
    } catch (error: any) {
      console.error("Error loading store:", error);
      toast.error("Erro ao carregar dados da loja");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (storeId: string) => {
    try {
      // Load inventory categories
      const { data: categoriesData, error: catError } = await supabase
        .from("inventory_categories")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order");

      if (catError) throw catError;
      setCategories(categoriesData || []);

      // Load inventory products for stats
      const { data: productsData, error: prodError } = await supabase
        .from("inventory_products")
        .select("id, name, stock_quantity, min_stock_alert, is_active, category_id")
        .eq("store_id", storeId);

      if (prodError) throw prodError;
      setProducts(productsData || []);

      // Load menu products with stock control
      const { data: menuProductsData, error: menuError } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          image_url, 
          stock_quantity, 
          min_stock_alert, 
          unit,
          is_available,
          categories!inner(name)
        `)
        .eq("store_id", storeId)
        .eq("has_stock_control", true);

      if (menuError) throw menuError;
      
      const formattedMenuProducts = (menuProductsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        stock_quantity: p.stock_quantity || 0,
        min_stock_alert: p.min_stock_alert || 5,
        unit: p.unit || 'un',
        is_available: p.is_available,
        category_name: p.categories?.name,
      }));
      setMenuProducts(formattedMenuProducts);

      // Calculate stats
      const activeProducts = productsData?.filter(p => p.is_active) || [];
      const allStockProducts = [...activeProducts, ...formattedMenuProducts];
      const lowStock = allStockProducts.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0);
      const outOfStock = allStockProducts.filter(p => p.stock_quantity <= 0);

      setStats({
        totalProducts: activeProducts.length + formattedMenuProducts.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        totalCategories: (categoriesData || []).filter(c => c.is_active).length,
        menuProductsWithStock: formattedMenuProducts.length,
      });
    } catch (error) {
      console.error("Error loading inventory data:", error);
      toast.error("Erro ao carregar inventário");
    }
  };

  const handleCategoryClick = (category: InventoryCategory) => {
    setSelectedCategory(category);
  };

  const handleBackFromCategory = () => {
    setSelectedCategory(null);
    if (storeId) loadData(storeId);
  };

  const getProductsInCategory = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId && p.is_active);
  };

  const getLowStockInCategory = (categoryId: string) => {
    return products.filter(
      p => p.category_id === categoryId && p.is_active && p.stock_quantity <= p.min_stock_alert
    );
  };

  const openAdjustment = (product: MenuProduct) => {
    setSelectedMenuProduct(product);
    setAdjustmentType('add');
    setAdjustmentQty('');
    setAdjustmentReason('');
    setAdjustmentOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedMenuProduct || !adjustmentQty || !storeId) return;
    
    setSaving(true);
    try {
      const qty = parseInt(adjustmentQty) || 0;
      const previousStock = selectedMenuProduct.stock_quantity;
      const newStock = adjustmentType === 'add' 
        ? previousStock + qty 
        : Math.max(0, previousStock - qty);

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", selectedMenuProduct.id);

      if (updateError) throw updateError;

      // Log movement in inventory_movements table
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          store_id: storeId,
          product_id: selectedMenuProduct.id,
          movement_type: adjustmentType === 'add' ? 'entrada' : 'saida',
          quantity: qty,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: adjustmentReason || (adjustmentType === 'add' ? 'Entrada manual' : 'Saída manual'),
          created_by: 'admin',
        });

      if (movementError) {
        console.warn("Could not log movement:", movementError);
      }

      toast.success("Estoque atualizado!");
      setAdjustmentOpen(false);
      loadData(storeId);
    } catch (error: any) {
      console.error("Error updating stock:", error);
      toast.error("Erro ao atualizar estoque");
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (product: MenuProduct) => {
    if (product.stock_quantity <= 0) {
      return { label: 'Esgotado', variant: 'destructive' as const };
    }
    if (product.stock_quantity <= product.min_stock_alert) {
      return { label: 'Baixo', variant: 'secondary' as const };
    }
    return { label: 'OK', variant: 'outline' as const };
  };

  // Batch selection functions
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === menuProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(menuProducts.map(p => p.id)));
    }
  };

  const openBatchAdjustment = () => {
    setBatchAdjustmentType('add');
    setBatchAdjustmentQty('');
    setBatchAdjustmentReason('');
    setBatchAdjustmentOpen(true);
  };

  const handleSaveBatchAdjustment = async () => {
    if (selectedProducts.size === 0 || !batchAdjustmentQty || !storeId) return;
    
    setSavingBatch(true);
    try {
      const qty = parseInt(batchAdjustmentQty) || 0;
      const productsToUpdate = menuProducts.filter(p => selectedProducts.has(p.id));
      
      for (const product of productsToUpdate) {
        const previousStock = product.stock_quantity;
        const newStock = batchAdjustmentType === 'add' 
          ? previousStock + qty 
          : Math.max(0, previousStock - qty);

        // Update product stock
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", product.id);

        if (updateError) throw updateError;

        // Log movement
        await supabase.from("inventory_movements").insert({
          store_id: storeId,
          product_id: product.id,
          movement_type: batchAdjustmentType === 'add' ? 'entrada' : 'saida',
          quantity: qty,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: batchAdjustmentReason || `Ajuste em lote - ${batchAdjustmentType === 'add' ? 'Entrada' : 'Saída'}`,
          created_by: 'admin',
        });
      }

      toast.success(`Estoque de ${productsToUpdate.length} produtos atualizado!`);
      setBatchAdjustmentOpen(false);
      setSelectedProducts(new Set());
      loadData(storeId);
    } catch (error: any) {
      console.error("Error updating batch stock:", error);
      toast.error("Erro ao atualizar estoque em lote");
    } finally {
      setSavingBatch(false);
    }
  };

  const getSelectedProductsPreview = () => {
    return menuProducts.filter(p => selectedProducts.has(p.id));
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loja não encontrada</p>
      </div>
    );
  }

  // If viewing a specific category
  if (selectedCategory) {
    return (
      <div className="p-6">
        <InventoryManager
          category={selectedCategory}
          storeId={storeId}
          onBack={handleBackFromCategory}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Estoque</h1>
          <p className="text-muted-foreground text-sm">
            Controle seus produtos, categorias e movimentações
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.menuProductsWithStock} do cardápio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              produtos precisam reposição
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              produtos esgotados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              categorias ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="menu-products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="menu-products" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Cardápio
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Movimentações
          </TabsTrigger>
        </TabsList>

        {/* Menu Products with Stock Control */}
        <TabsContent value="menu-products" className="space-y-4">
          {menuProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum produto com controle de estoque</h3>
                <p className="text-muted-foreground text-sm text-center mb-4 max-w-sm">
                  Para controlar o estoque de itens do cardápio, edite o item e ative "Controlar estoque deste item".
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Produtos do Cardápio</CardTitle>
                  <CardDescription>
                    Itens do cardápio com controle de estoque ativado
                  </CardDescription>
                </div>
                {menuProducts.length > 0 && (
                  <div className="flex items-center gap-2">
                    {selectedProducts.size > 0 && (
                      <Badge variant="secondary" className="mr-2">
                        {selectedProducts.size} selecionado{selectedProducts.size > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openBatchAdjustment}
                      disabled={selectedProducts.size === 0}
                      className="gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      Ajuste em Lote
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.size === menuProducts.length && menuProducts.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuProducts.map((product) => {
                      const status = getStockStatus(product);
                      const isSelected = selectedProducts.has(product.id);
                      return (
                        <TableRow key={product.id} className={isSelected ? "bg-muted/50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                              aria-label={`Selecionar ${product.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.category_name || '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {product.stock_quantity} {product.unit}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {product.min_stock_alert} {product.unit}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAdjustment(product)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Ajustar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="movements">
          <InventoryMovementReport storeId={storeId} onBack={() => {}} />
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Modal */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>
          {selectedMenuProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedMenuProduct.image_url ? (
                  <img 
                    src={selectedMenuProduct.image_url} 
                    alt={selectedMenuProduct.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedMenuProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Estoque atual: {selectedMenuProduct.stock_quantity} {selectedMenuProduct.unit}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de ajuste</Label>
                <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as 'add' | 'remove')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">➕ Entrada (adicionar)</SelectItem>
                    <SelectItem value="remove">➖ Saída (remover)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="0"
                />
                {adjustmentQty && (
                  <p className="text-xs text-muted-foreground">
                    Novo estoque: {adjustmentType === 'add' 
                      ? selectedMenuProduct.stock_quantity + (parseInt(adjustmentQty) || 0)
                      : Math.max(0, selectedMenuProduct.stock_quantity - (parseInt(adjustmentQty) || 0))
                    } {selectedMenuProduct.unit}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ex: Compra de fornecedor, perda, etc."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAdjustment} disabled={saving || !adjustmentQty}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Stock Adjustment Modal */}
      <Dialog open={batchAdjustmentOpen} onOpenChange={setBatchAdjustmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Ajuste em Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected Products Preview */}
            <div className="space-y-2">
              <Label>Produtos selecionados ({selectedProducts.size})</Label>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-2">
                  {getSelectedProductsPreview().map((product) => (
                    <div key={product.id} className="flex items-center gap-2 text-sm">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                          <Package className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{product.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {product.stock_quantity} {product.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label>Tipo de ajuste</Label>
              <Select value={batchAdjustmentType} onValueChange={(v) => setBatchAdjustmentType(v as 'add' | 'remove')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">➕ Entrada (adicionar)</SelectItem>
                  <SelectItem value="remove">➖ Saída (remover)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade a {batchAdjustmentType === 'add' ? 'adicionar' : 'remover'} de cada produto</Label>
              <Input
                type="number"
                min="1"
                value={batchAdjustmentQty}
                onChange={(e) => setBatchAdjustmentQty(e.target.value)}
                placeholder="0"
              />
              {batchAdjustmentQty && (
                <p className="text-xs text-muted-foreground">
                  Cada produto terá {batchAdjustmentType === 'add' ? '+' : '-'}{batchAdjustmentQty} unidades
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                value={batchAdjustmentReason}
                onChange={(e) => setBatchAdjustmentReason(e.target.value)}
                placeholder="Ex: Compra de fornecedor, inventário, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAdjustmentOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBatchAdjustment} disabled={savingBatch || !batchAdjustmentQty}>
              {savingBatch ? 'Salvando...' : `Ajustar ${selectedProducts.size} produtos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
