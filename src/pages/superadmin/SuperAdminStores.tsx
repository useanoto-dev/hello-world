import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Search, Store, ExternalLink, Power, PowerOff, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  subscription_status: string | null;
  trial_ends_at: string | null;
}

type TabFilter = "all" | "trial_active" | "trial_expired" | "subscribed";

export default function SuperAdminStores() {
  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");
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
          const [ordersRes, productsRes, customersRes, ownerRes, subscriptionRes] = await Promise.all([
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
            supabase
              .from("subscriptions")
              .select("status, trial_ends_at")
              .eq("store_id", store.id)
              .maybeSingle(),
          ]);

          return {
            ...store,
            owner_email: ownerRes.data?.email || null,
            total_orders: ordersRes.count || 0,
            total_products: productsRes.count || 0,
            total_customers: customersRes.count || 0,
            subscription_status: subscriptionRes.data?.status || null,
            trial_ends_at: subscriptionRes.data?.trial_ends_at || null,
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

  // Helper functions
  const isTrialActive = (store: StoreWithStats) => {
    if (store.subscription_status !== "trial" || !store.trial_ends_at) return false;
    return new Date(store.trial_ends_at) > new Date();
  };

  const isTrialExpired = (store: StoreWithStats) => {
    if (store.subscription_status !== "trial" || !store.trial_ends_at) return false;
    return new Date(store.trial_ends_at) <= new Date();
  };

  const isSubscribed = (store: StoreWithStats) => {
    return store.subscription_status === "active";
  };

  const getDaysRemaining = (trialEndsAt: string) => {
    const now = new Date();
    const end = new Date(trialEndsAt);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Calculate stats
  const trialActiveCount = stores?.filter(isTrialActive).length || 0;
  const trialExpiredCount = stores?.filter(isTrialExpired).length || 0;
  const subscribedCount = stores?.filter(isSubscribed).length || 0;
  const totalCount = stores?.length || 0;

  // Filter stores based on tab
  const getFilteredStores = () => {
    let filtered = stores || [];

    // Apply tab filter
    switch (tabFilter) {
      case "trial_active":
        filtered = filtered.filter(isTrialActive);
        break;
      case "trial_expired":
        filtered = filtered.filter(isTrialExpired);
        break;
      case "subscribed":
        filtered = filtered.filter(isSubscribed);
        break;
    }

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (store) =>
          store.name.toLowerCase().includes(search.toLowerCase()) ||
          store.slug.toLowerCase().includes(search.toLowerCase()) ||
          store.owner_email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredStores = getFilteredStores();

  const getTrialBadge = (store: StoreWithStats) => {
    if (isSubscribed(store)) {
      return (
        <Badge className="bg-success/20 text-success hover:bg-success/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Assinante
        </Badge>
      );
    }

    if (isTrialActive(store) && store.trial_ends_at) {
      const daysRemaining = getDaysRemaining(store.trial_ends_at);
      return (
        <Badge className="bg-blue-500/20 text-blue-600 hover:bg-blue-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Trial ({daysRemaining}d)
        </Badge>
      );
    }

    if (isTrialExpired(store)) {
      return (
        <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/20">
          <XCircle className="w-3 h-3 mr-1" />
          Trial Vencido
        </Badge>
      );
    }

    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted">
        Sem assinatura
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="admin-page-header flex items-center justify-between">
        <div>
          <h1 className="admin-page-title text-2xl">
            Gerenciar Lojas
          </h1>
          <p className="admin-page-description">
            {stores?.length || 0} lojas cadastradas no sistema
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total de Lojas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trialActiveCount}</p>
                <p className="text-xs text-muted-foreground">Em Trial Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trialExpiredCount}</p>
                <p className="text-xs text-muted-foreground">Trial Vencido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{subscribedCount}</p>
                <p className="text-xs text-muted-foreground">Assinantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <Card className="admin-card">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, slug ou email do proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as TabFilter)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">
                Todas ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="trial_active" className="text-xs">
                Trial Ativo ({trialActiveCount})
              </TabsTrigger>
              <TabsTrigger value="trial_expired" className="text-xs">
                Trial Vencido ({trialExpiredCount})
              </TabsTrigger>
              <TabsTrigger value="subscribed" className="text-xs">
                Assinantes ({subscribedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Stores Table */}
      <Card className="admin-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="admin-table-header">Loja</TableHead>
                <TableHead className="admin-table-header">Proprietário</TableHead>
                <TableHead className="admin-table-header text-center">Assinatura</TableHead>
                <TableHead className="admin-table-header text-center">Pedidos</TableHead>
                <TableHead className="admin-table-header text-center">Produtos</TableHead>
                <TableHead className="admin-table-header text-center">Status</TableHead>
                <TableHead className="admin-table-header text-center">Criada em</TableHead>
                <TableHead className="admin-table-header text-right">Ações</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma loja encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="admin-table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Store className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="admin-table-cell">
                      <span className="text-sm text-muted-foreground">
                        {store.owner_email || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      {getTrialBadge(store)}
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      <span className="font-medium text-foreground">{store.total_orders}</span>
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      <span className="font-medium text-foreground">{store.total_products}</span>
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      <Badge
                        className={cn(
                          "text-xs",
                          store.is_active
                            ? "bg-success/20 text-success hover:bg-success/20"
                            : "bg-destructive/20 text-destructive hover:bg-destructive/20"
                        )}
                      >
                        {store.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      <span className="text-sm text-muted-foreground">
                        {new Date(store.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                    <TableCell className="admin-table-cell text-right">
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
                              ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                              : "text-success hover:text-success hover:bg-success/10"
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
              className={storeToToggle?.is_active ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"}
            >
              {storeToToggle?.is_active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
