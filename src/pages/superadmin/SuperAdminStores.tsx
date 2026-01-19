import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Search, Store, ExternalLink, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

interface StoreWithStats {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  owner_email: string | null;
  total_orders: number;
  total_products: number;
  total_customers: number;
}

export default function SuperAdminStores() {
  const [search, setSearch] = useState("");
  const [storeToToggle, setStoreToToggle] = useState<StoreWithStats | null>(null);
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ["superadmin-stores"],
    queryFn: async () => {
      // Fetch stores with owner info
      const { data: storesData, error } = await supabase
        .from("stores")
        .select(`
          id,
          name,
          slug,
          is_active,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch stats for each store
      const storesWithStats: StoreWithStats[] = await Promise.all(
        (storesData || []).map(async (store) => {
          const [ordersRes, productsRes, customersRes, ownerRes] = await Promise.all([
            supabase
              .from("orders")
              .select("*", { count: "exact", head: true })
              .eq("store_id", store.id),
            supabase
              .from("products")
              .select("*", { count: "exact", head: true })
              .eq("store_id", store.id),
            supabase
              .from("customers")
              .select("*", { count: "exact", head: true })
              .eq("store_id", store.id),
            supabase
              .from("profiles")
              .select("email")
              .eq("store_id", store.id)
              .eq("is_owner", true)
              .maybeSingle(),
          ]);

          return {
            ...store,
            owner_email: ownerRes.data?.email || null,
            total_orders: ordersRes.count || 0,
            total_products: productsRes.count || 0,
            total_customers: customersRes.count || 0,
          };
        })
      );

      return storesWithStats;
    },
  });

  const toggleStoreMutation = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_active: isActive })
        .eq("id", storeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-stores"] });
      toast.success(
        storeToToggle?.is_active
          ? "Loja desativada com sucesso"
          : "Loja ativada com sucesso"
      );
      setStoreToToggle(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar status da loja");
    },
  });

  const filteredStores = stores?.filter(
    (store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.slug.toLowerCase().includes(search.toLowerCase()) ||
      store.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gerenciar Lojas
          </h1>
          <p className="text-gray-500 mt-1">
            {stores?.length || 0} lojas cadastradas no sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, slug ou email do proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stores Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStores?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhuma loja encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Store className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-xs text-gray-500">{store.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {store.owner_email || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{store.total_orders}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{store.total_products}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{store.total_customers}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={store.is_active ? "default" : "destructive"}
                        className={
                          store.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : ""
                        }
                      >
                        {store.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-gray-500">
                        {new Date(store.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/cardapio/${store.slug}`, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStoreToToggle(store)}
                          className={
                            store.is_active
                              ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }
                        >
                          {store.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Toggle Confirmation Dialog */}
      <AlertDialog open={!!storeToToggle} onOpenChange={() => setStoreToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {storeToToggle?.is_active ? "Desativar Loja?" : "Ativar Loja?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {storeToToggle?.is_active
                ? `A loja "${storeToToggle?.name}" será desativada e não ficará mais acessível para os clientes.`
                : `A loja "${storeToToggle?.name}" será ativada e voltará a ficar acessível para os clientes.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (storeToToggle) {
                  toggleStoreMutation.mutate({
                    storeId: storeToToggle.id,
                    isActive: !storeToToggle.is_active,
                  });
                }
              }}
              className={storeToToggle?.is_active ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {storeToToggle?.is_active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
