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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Uso de Dados
        </h1>
        <p className="text-gray-500 mt-1">
          Visualize quanto cada conta consome de recursos do sistema
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.orders}</p>
                <p className="text-xs text-gray-500">Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.products}</p>
                <p className="text-xs text-gray-500">Produtos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.customers}</p>
                <p className="text-xs text-gray-500">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Image className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.banners}</p>
                <p className="text-xs text-gray-500">Banners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.categories}</p>
                <p className="text-xs text-gray-500">Categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Store */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Uso por Loja</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Categorias</TableHead>
                <TableHead>Uso Relativo</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma loja encontrada
                  </TableCell>
                </TableRow>
              ) : (
                storeUsage?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {store.orders_count}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {store.products_count}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {store.customers_count}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {store.categories_count}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(store.total_items / maxUsage) * 100}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-gray-500 w-12">
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
