import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Workflow, Eye, Settings, Pizza, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlowEditor, { FlowStep } from "@/components/admin/flow-editor/FlowEditor";

export default function FlowsPage() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Fetch pizza categories
  const { data: pizzaCategories, isLoading } = useQuery({
    queryKey: ["pizza-categories", profile?.store_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", profile?.store_id!)
        .eq("category_type", "pizza")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.store_id && !authLoading,
  });

  // Fetch all categories (for flow node selection)
  const { data: allCategories } = useQuery({
    queryKey: ["all-categories", profile?.store_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, image_url")
        .eq("store_id", profile?.store_id!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.store_id && !authLoading,
  });

  // Fetch banners for promotions
  const { data: banners } = useQuery({
    queryKey: ["banners", profile?.store_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("id, title, image_url, is_active")
        .eq("store_id", profile?.store_id!)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.store_id && !authLoading,
  });

  // Set first category as selected by default
  useEffect(() => {
    if (pizzaCategories?.length && !selectedCategoryId) {
      setSelectedCategoryId(pizzaCategories[0].id);
    }
  }, [pizzaCategories, selectedCategoryId]);

  // Fetch flow steps for selected category
  const { data: flowSteps } = useQuery({
    queryKey: ["flow-steps", selectedCategoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pizza_flow_steps")
        .select("*")
        .eq("category_id", selectedCategoryId!);
      if (error) throw error;
      return (data || []).map(step => ({
        id: step.step_type, // Use step_type as id for matching with defaults
        step_type: step.step_type,
        step_order: step.step_order,
        is_enabled: step.is_enabled,
        next_step_id: step.next_step_id,
        position_x: Number(step.position_x) || 0,
        position_y: Number(step.position_y) || 0,
      })) as FlowStep[];
    },
    enabled: !!selectedCategoryId,
  });

  // Fetch selected category details
  const selectedCategory = pizzaCategories?.find(c => c.id === selectedCategoryId);

  // Save flow mutation
  const saveFlowMutation = useMutation({
    mutationFn: async (steps: FlowStep[]) => {
      if (!selectedCategoryId || !profile?.store_id) throw new Error("Missing data");

      // Delete existing steps for this category
      await supabase
        .from("pizza_flow_steps")
        .delete()
        .eq("category_id", selectedCategoryId);

      // Insert new steps
      const insertData = steps.map(step => ({
        store_id: profile.store_id,
        category_id: selectedCategoryId,
        step_type: step.step_type,
        step_order: step.step_order,
        is_enabled: step.is_enabled,
        next_step_id: step.next_step_id,
        position_x: step.position_x,
        position_y: step.position_y,
      }));

      const { error } = await supabase
        .from("pizza_flow_steps")
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow-steps"] });
      // Also invalidate storefront cache so changes reflect immediately
      queryClient.invalidateQueries({ queryKey: ["store-content"] });
      toast.success("Fluxo salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar fluxo");
    },
  });

  // Toggle sequential flow for category
  const toggleSequentialFlowMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!selectedCategoryId) throw new Error("No category selected");
      
      const { error } = await supabase
        .from("categories")
        .update({ use_sequential_flow: enabled })
        .eq("id", selectedCategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pizza-categories"] });
      toast.success("Configuração atualizada!");
    },
  });

  // Toggle show flavor prices
  const toggleShowFlavorPricesMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!selectedCategoryId) throw new Error("No category selected");
      
      const { error } = await supabase
        .from("categories")
        .update({ show_flavor_prices: enabled })
        .eq("id", selectedCategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pizza-categories"] });
      toast.success("Configuração atualizada!");
    },
  });

  // Update banner status
  const updateBannerStatusMutation = useMutation({
    mutationFn: async ({ bannerId, isActive }: { bannerId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: isActive })
        .eq("id", bannerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });

  const handleSaveFlow = (steps: FlowStep[]) => {
    saveFlowMutation.mutate(steps);
  };

  const handleBannerStatusChange = (bannerId: string, isActive: boolean) => {
    updateBannerStatusMutation.mutate({ bannerId, isActive });
  };

  if (isLoading || authLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-4 bg-muted rounded w-96" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!pizzaCategories?.length) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <Pizza className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-sm font-semibold mb-1">Nenhuma categoria de pizza</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Crie uma categoria do tipo "Pizza" para configurar o fluxo.
            </p>
            <Button asChild size="sm" className="h-8 text-xs">
              <a href="/dashboard/category/new">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Criar Categoria Pizza
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold flex items-center gap-2">
          <Workflow className="w-4 h-4" />
          Configuração de Fluxo
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Configure o fluxo de pedidos para cada categoria de pizza
        </p>
      </div>

      <Tabs value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
        <TabsList className="h-8 bg-muted/50">
          {pizzaCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs h-7 gap-1.5">
              <Pizza className="w-3.5 h-3.5" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {pizzaCategories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4 mt-4">
            {/* Settings Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4" />
                  Configurações
                </CardTitle>
                <CardDescription className="text-xs">
                  Configurações para {category.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Fluxo Sequencial</Label>
                    <p className="text-xs text-muted-foreground">
                      Fluxo passo-a-passo para montagem
                    </p>
                  </div>
                  <Switch
                    checked={selectedCategory?.use_sequential_flow ?? false}
                    onCheckedChange={(checked) => toggleSequentialFlowMutation.mutate(checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Exibir Preços dos Sabores</Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar preço de cada sabor no cardápio
                    </p>
                  </div>
                  <Switch
                    checked={selectedCategory?.show_flavor_prices ?? false}
                    onCheckedChange={(checked) => toggleShowFlavorPricesMutation.mutate(checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Flow Editor */}
            {selectedCategory?.use_sequential_flow && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Editor Visual de Fluxo
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Arraste e conecte as etapas. Duplo clique nas setas para remover conexões.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FlowEditor
                    steps={flowSteps || []}
                    onSave={handleSaveFlow}
                    isSaving={saveFlowMutation.isPending}
                    categories={allCategories || []}
                    banners={banners || []}
                    onBannerStatusChange={handleBannerStatusChange}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
