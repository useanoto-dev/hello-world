import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Store, Image, FileText, ShoppingCart } from "lucide-react";

interface StoreUsage {
  id: string;
  name: string;
  slug: string;
  orders_count: number;
  products_count: number;
  customers_count: number;
  banners_count: number;
  categories_count: number;
  total_items: number;
}

export default function SuperAdminUsage() {
  const { data: storeUsage, isLoading } = useQuery({
    queryKey: ["superadmin-usage"],
    queryFn: async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");

      const usageData: StoreUsage[] = await Promise.all(
        (stores || []).map(async (store) => {
          const [orders, products, customers, banners, categories] = await Promise.all([
            supabase.from("orders").select("*", { count: "exact", head: true }).eq("store_id", store.id),
            supabase.from("products").select("*", { count: "exact", head: true }).eq("store_id", store.id),
            supabase.from("customers").select("*", { count: "exact", head: true }).eq("store_id", store.id),
            supabase.from("banners").select("*", { count: "exact", head: true }).eq("store_id", store.id),
            supabase.from("categories").select("*", { count: "exact", head: true }).eq("store_id", store.id),
          ]);

          const ordersCount = orders.count || 0;
          const productsCount = products.count || 0;
          const customersCount = customers.count || 0;
          const bannersCount = banners.count || 0;
          const categoriesCount = categories.count || 0;

          return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            orders_count: ordersCount,
            products_count: productsCount,
            customers_count: customersCount,
            banners_count: bannersCount,
            categories_count: categoriesCount,
            total_items: ordersCount + productsCount + customersCount + bannersCount + categoriesCount,
          };
        })
      );

      // Sort by total items
      return usageData.sort((a, b) => b.total_items - a.total_items);
    },
  });

  // Calculate totals
  const totals = storeUsage?.reduce(
    (acc, store) => ({
      orders: acc.orders + store.orders_count,
      products: acc.products + store.products_count,
      customers: acc.customers + store.customers_count,
      banners: acc.banners + store.banners_count,
      categories: acc.categories + store.categories_count,
    }),
    { orders: 0, products: 0, customers: 0, banners: 0, categories: 0 }
  ) || { orders: 0, products: 0, customers: 0, banners: 0, categories: 0 };

  const maxUsage = storeUsage?.[0]?.total_items || 1;

  return (
    <div className="p-6 space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title text-2xl">
          Uso de Dados
        </h1>
        <p className="admin-page-description">
          Visualize quanto cada conta consome de recursos do sistema
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.orders}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.products}</p>
                <p className="text-xs text-muted-foreground">Produtos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.customers}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.banners}</p>
                <p className="text-xs text-muted-foreground">Banners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.categories}</p>
                <p className="text-xs text-muted-foreground">Categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Store */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Uso por Loja</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="admin-table-header">Loja</TableHead>
                <TableHead className="admin-table-header text-center">Pedidos</TableHead>
                <TableHead className="admin-table-header text-center">Produtos</TableHead>
                <TableHead className="admin-table-header text-center">Clientes</TableHead>
                <TableHead className="admin-table-header text-center">Categorias</TableHead>
                <TableHead className="admin-table-header">Uso Relativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : storeUsage?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma loja encontrada
                  </TableCell>
                </TableRow>
              ) : (
                storeUsage?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="admin-table-cell">
                      <div>
                        <p className="font-medium text-foreground">{store.name}</p>
                        <p className="text-xs text-muted-foreground">{store.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="admin-table-cell text-center font-medium text-foreground">
                      {store.orders_count}
                    </TableCell>
                    <TableCell className="admin-table-cell text-center font-medium text-foreground">
                      {store.products_count}
                    </TableCell>
                    <TableCell className="admin-table-cell text-center font-medium text-foreground">
                      {store.customers_count}
                    </TableCell>
                    <TableCell className="admin-table-cell text-center font-medium text-foreground">
                      {store.categories_count}
                    </TableCell>
                    <TableCell className="admin-table-cell">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(store.total_items / maxUsage) * 100}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-muted-foreground w-12">
                          {store.total_items}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
