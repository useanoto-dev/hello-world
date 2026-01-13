// Category Editor Page - Compact Layout with Flow Sync
import { useState, useEffect, KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CompactPizzaSizeItem, PizzaSize } from "@/components/admin/CompactPizzaSizeItem";
import { CompactPizzaOptionItem, PizzaOption, OptionPrice } from "@/components/admin/CompactPizzaOptionItem";

const PIZZA_STEPS = [
  { id: 1, label: "Categoria" },
  { id: 2, label: "Tamanhos" },
  { id: 3, label: "Bordas" },
  { id: 4, label: "Massas" },
  { id: 5, label: "Adicionais" },
];

const DAYS = [
  { key: 'sunday', label: 'Domingo', short: 'D' },
  { key: 'monday', label: 'Segunda', short: 'S' },
  { key: 'tuesday', label: 'Terça', short: 'T' },
  { key: 'wednesday', label: 'Quarta', short: 'Q' },
  { key: 'thursday', label: 'Quinta', short: 'Q' },
  { key: 'friday', label: 'Sexta', short: 'S' },
  { key: 'saturday', label: 'Sábado', short: 'S' },
];

interface ScheduleItem {
  days: string[];
  startTime: string;
  endTime: string;
}

export default function CategoryEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!searchParams.get('edit'));
  const [storeId, setStoreId] = useState<string | null>(null);
  
  // Form state
  const [modelo, setModelo] = useState<"padrao" | "pizza">("padrao");
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [availability, setAvailability] = useState<"always" | "paused" | "scheduled">("always");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { days: [], startTime: "00:00", endTime: "23:59" }
  ]);
  const [channels, setChannels] = useState({
    all: true,
    appGarcom: true,
    pdv: true,
    cardapioDigital: true,
    cardapioQRCode: true,
  });
  
  // Pizza sizes state
  const [pizzaSizes, setPizzaSizes] = useState<PizzaSize[]>([
    { id: crypto.randomUUID(), image: null, name: "", slices: 4, flavors: 1, priceModel: "highest", isOut: false, basePrice: 0 }
  ]);

  // Pizza options (edges, doughs, extras) - unified structure
  const [hasEdges, setHasEdges] = useState<"yes" | "no">("no");
  const [edgesRequired, setEdgesRequired] = useState<"optional" | "required">("optional");
  const [pizzaEdges, setPizzaEdges] = useState<PizzaOption[]>([]);

  const [hasDoughs, setHasDoughs] = useState<"yes" | "no">("no");
  const [doughsRequired, setDoughsRequired] = useState<"optional" | "required">("optional");
  const [pizzaDoughs, setPizzaDoughs] = useState<PizzaOption[]>([]);

  const [hasExtras, setHasExtras] = useState<"yes" | "no">("no");
  const [extrasRequired, setExtrasRequired] = useState<"optional" | "required">("optional");
  const [extrasMin, setExtrasMin] = useState(0);
  const [extrasMax, setExtrasMax] = useState(10);
  const [pizzaExtras, setPizzaExtras] = useState<PizzaOption[]>([]);

  // Promotion modal state
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionPercent, setPromotionPercent] = useState("");

  // Helper function to create prices based on pizza sizes
  const createOptionPrices = (): OptionPrice[] => {
    return pizzaSizes.map(size => ({
      sizeId: size.id,
      sizeName: size.name || "Tamanho",
      enabled: false,
      price: "0"
    }));
  };

  // ===== EDGES =====
  const addPizzaEdge = () => {
    setPizzaEdges(prev => [...prev, {
      id: crypto.randomUUID(),
      title: "",
      isOut: false,
      prices: createOptionPrices()
    }]);
  };

  const removePizzaEdge = (id: string) => {
    if (pizzaEdges.length > 1) {
      setPizzaEdges(prev => prev.filter(e => e.id !== id));
    }
  };

  const updatePizzaEdge = (id: string, field: keyof PizzaOption, value: any) => {
    setPizzaEdges(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const updateEdgePrice = (edgeId: string, sizeId: string, field: "enabled" | "price", value: any) => {
    setPizzaEdges(prev => prev.map(edge => {
      if (edge.id !== edgeId) return edge;
      return {
        ...edge,
        prices: edge.prices.map(p => p.sizeId === sizeId ? { ...p, [field]: value } : p)
      };
    }));
  };

  useEffect(() => {
    if (hasEdges === "yes" && pizzaEdges.length === 0) {
      addPizzaEdge();
    }
  }, [hasEdges]);

  useEffect(() => {
    if (pizzaEdges.length > 0) {
      setPizzaEdges(prev => prev.map(edge => ({
        ...edge,
        prices: pizzaSizes.map(size => {
          const existingPrice = edge.prices.find(p => p.sizeId === size.id);
          return existingPrice 
            ? { ...existingPrice, sizeName: size.name || "Tamanho" }
            : { sizeId: size.id, sizeName: size.name || "Tamanho", enabled: false, price: "0" };
        })
      })));
    }
  }, [pizzaSizes]);

  // ===== DOUGHS =====
  const addPizzaDough = () => {
    setPizzaDoughs(prev => [...prev, {
      id: crypto.randomUUID(),
      title: "",
      isOut: false,
      prices: createOptionPrices()
    }]);
  };

  const removePizzaDough = (id: string) => {
    if (pizzaDoughs.length > 1) {
      setPizzaDoughs(prev => prev.filter(e => e.id !== id));
    }
  };

  const updatePizzaDough = (id: string, field: keyof PizzaOption, value: any) => {
    setPizzaDoughs(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const updateDoughPrice = (doughId: string, sizeId: string, field: "enabled" | "price", value: any) => {
    setPizzaDoughs(prev => prev.map(dough => {
      if (dough.id !== doughId) return dough;
      return {
        ...dough,
        prices: dough.prices.map(p => p.sizeId === sizeId ? { ...p, [field]: value } : p)
      };
    }));
  };

  useEffect(() => {
    if (hasDoughs === "yes" && pizzaDoughs.length === 0) {
      addPizzaDough();
    }
  }, [hasDoughs]);

  useEffect(() => {
    if (pizzaDoughs.length > 0) {
      setPizzaDoughs(prev => prev.map(dough => ({
        ...dough,
        prices: pizzaSizes.map(size => {
          const existingPrice = dough.prices.find(p => p.sizeId === size.id);
          return existingPrice 
            ? { ...existingPrice, sizeName: size.name || "Tamanho" }
            : { sizeId: size.id, sizeName: size.name || "Tamanho", enabled: false, price: "0" };
        })
      })));
    }
  }, [pizzaSizes]);

  // ===== EXTRAS =====
  const addPizzaExtra = () => {
    setPizzaExtras(prev => [...prev, {
      id: crypto.randomUUID(),
      title: "",
      isOut: false,
      prices: createOptionPrices()
    }]);
  };

  const removePizzaExtra = (id: string) => {
    if (pizzaExtras.length > 1) {
      setPizzaExtras(prev => prev.filter(e => e.id !== id));
    }
  };

  const updatePizzaExtra = (id: string, field: keyof PizzaOption, value: any) => {
    setPizzaExtras(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const updateExtraPrice = (extraId: string, sizeId: string, field: "enabled" | "price", value: any) => {
    setPizzaExtras(prev => prev.map(extra => {
      if (extra.id !== extraId) return extra;
      return {
        ...extra,
        prices: extra.prices.map(p => p.sizeId === sizeId ? { ...p, [field]: value } : p)
      };
    }));
  };

  useEffect(() => {
    if (hasExtras === "yes" && pizzaExtras.length === 0) {
      addPizzaExtra();
    }
  }, [hasExtras]);

  useEffect(() => {
    if (pizzaExtras.length > 0) {
      setPizzaExtras(prev => prev.map(extra => ({
        ...extra,
        prices: pizzaSizes.map(size => {
          const existingPrice = extra.prices.find(p => p.sizeId === size.id);
          return existingPrice 
            ? { ...existingPrice, sizeName: size.name || "Tamanho" }
            : { sizeId: size.id, sizeName: size.name || "Tamanho", enabled: false, price: "0" };
        })
      })));
    }
  }, [pizzaSizes]);

  useEffect(() => {
    loadStoreId();
    if (editId) {
      loadCategory(editId);
    }
  }, [editId]);

  useEffect(() => {
    setCurrentStep(1);
  }, [modelo]);

  const loadStoreId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.store_id) {
      setStoreId(profile.store_id);
    }
  };

  const loadCategory = async (id: string) => {
    setInitialLoading(true);
    try {
      const { data: categoryData } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();

      if (!categoryData) return;

      setName(categoryData.name);
      setIsPromotion(!!categoryData.description);
      setPromotionMessage(categoryData.description || "");
      setAvailability(categoryData.is_active ? "always" : "paused");
      setModelo(categoryData.category_type === "pizza" ? "pizza" : "padrao");

      if (categoryData.category_type === "pizza") {
        const { data: sizesData } = await supabase
          .from("pizza_sizes")
          .select("*")
          .eq("category_id", id)
          .order("display_order");

        if (sizesData && sizesData.length > 0) {
          const loadedSizes: PizzaSize[] = sizesData.map(size => ({
            id: size.id,
            image: size.image_url,
            name: size.name,
            slices: size.slices,
            flavors: size.max_flavors,
            priceModel: size.price_model as "sum" | "average" | "highest",
            isOut: !size.is_active,
            basePrice: size.base_price || 0,
          }));
          setPizzaSizes(loadedSizes);
        }

        // Load edges
        const { data: edgesData } = await supabase
          .from("pizza_edges")
          .select("*, pizza_edge_prices(*)")
          .eq("category_id", id)
          .order("display_order");

        if (edgesData && edgesData.length > 0) {
          setHasEdges("yes");
          const loadedEdges: PizzaOption[] = edgesData.map(edge => ({
            id: edge.id,
            title: edge.name,
            isOut: !edge.is_active,
            prices: sizesData?.map(size => {
              const priceData = edge.pizza_edge_prices?.find((p: any) => p.size_id === size.id);
              return {
                sizeId: size.id,
                sizeName: size.name,
                enabled: priceData?.is_available ?? false,
                price: priceData?.price?.toString() ?? "0",
              };
            }) || [],
          }));
          setPizzaEdges(loadedEdges);
        }

        // Load doughs
        const { data: doughsData } = await supabase
          .from("pizza_doughs")
          .select("*, pizza_dough_prices(*)")
          .eq("category_id", id)
          .order("display_order");

        if (doughsData && doughsData.length > 0) {
          setHasDoughs("yes");
          const loadedDoughs: PizzaOption[] = doughsData.map(dough => ({
            id: dough.id,
            title: dough.name,
            isOut: !dough.is_active,
            prices: sizesData?.map(size => {
              const priceData = dough.pizza_dough_prices?.find((p: any) => p.size_id === size.id);
              return {
                sizeId: size.id,
                sizeName: size.name,
                enabled: priceData?.is_available ?? false,
                price: priceData?.price?.toString() ?? "0",
              };
            }) || [],
          }));
          setPizzaDoughs(loadedDoughs);
        }
      }
    } catch (error) {
      console.error("Error loading category:", error);
      toast.error("Erro ao carregar categoria");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChannelChange = (channel: keyof typeof channels, checked: boolean) => {
    if (channel === "all") {
      setChannels({
        all: checked,
        appGarcom: checked,
        pdv: checked,
        cardapioDigital: checked,
        cardapioQRCode: checked,
      });
    } else {
      const newChannels = { ...channels, [channel]: checked };
      const allChecked = newChannels.appGarcom && newChannels.pdv && newChannels.cardapioDigital && newChannels.cardapioQRCode;
      setChannels({ ...newChannels, all: allChecked });
    }
  };

  const toggleDay = (scheduleIndex: number, dayKey: string) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      const days = newSchedules[scheduleIndex].days;
      if (days.includes(dayKey)) {
        newSchedules[scheduleIndex].days = days.filter(d => d !== dayKey);
      } else {
        newSchedules[scheduleIndex].days = [...days, dayKey];
      }
      return newSchedules;
    });
  };

  const addSchedule = () => {
    setSchedules(prev => [...prev, { days: [], startTime: "00:00", endTime: "23:59" }]);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Pizza sizes functions
  const addPizzaSize = () => {
    setPizzaSizes(prev => [...prev, { 
      id: crypto.randomUUID(), 
      image: null, 
      name: "", 
      slices: 4, 
      flavors: 1, 
      priceModel: "highest", 
      isOut: false,
      basePrice: 0 
    }]);
  };

  const removePizzaSize = (id: string) => {
    if (pizzaSizes.length > 1) {
      setPizzaSizes(prev => prev.filter(s => s.id !== id));
    }
  };

  const updatePizzaSize = (id: string, field: keyof PizzaSize, value: any) => {
    setPizzaSizes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const incrementValue = (id: string, field: "slices" | "flavors") => {
    setPizzaSizes(prev => prev.map(s => s.id === id ? { ...s, [field]: s[field] + 1 } : s));
  };

  const decrementValue = (id: string, field: "slices" | "flavors") => {
    setPizzaSizes(prev => prev.map(s => s.id === id && s[field] > 1 ? { ...s, [field]: s[field] - 1 } : s));
  };

  // Handle Enter key to add new size
  const handleSizeKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If it's the last size, add a new one
      if (index === pizzaSizes.length - 1) {
        addPizzaSize();
        // Focus the new input after render
        setTimeout(() => {
          const inputs = document.querySelectorAll('[data-size-input]');
          const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
          lastInput?.focus();
        }, 50);
      }
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPizzaSizes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleEdgeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPizzaEdges((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDoughDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPizzaDoughs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleExtrasDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPizzaExtras((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async (createItems?: boolean) => {
    if (!storeId || !name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (isPizza && pizzaSizes.filter(s => s.name.trim()).length === 0) {
      toast.error("Adicione pelo menos um tamanho de pizza");
      return;
    }

    setLoading(true);
    try {
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const data = {
        store_id: storeId,
        name: name.trim(),
        slug,
        description: isPromotion ? promotionMessage : null,
        is_active: availability !== "paused",
        category_type: modelo,
        use_sequential_flow: isPizza,
      };

      let categoryId: string;

      if (editId) {
        const { error } = await supabase
          .from("categories")
          .update(data)
          .eq("id", editId);

        if (error) throw error;
        categoryId = editId;
        
        if (isPizza) {
          await supabase
            .from("category_option_groups")
            .delete()
            .eq("category_id", categoryId);
        }
      } else {
        const { data: result, error } = await supabase
          .from("categories")
          .insert(data)
          .select("id")
          .single();

        if (error) throw error;
        categoryId = result.id;
      }

      if (isPizza) {
        await savePizzaOptionGroups(categoryId);
        // Sync flow steps based on options
        await syncFlowSteps(categoryId);
      }

      toast.success(editId ? "Categoria atualizada!" : "Categoria criada!");

      if (createItems) {
        navigate(`/dashboard/products?addItem=${categoryId}`);
      } else {
        navigate("/dashboard/products");
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  // Sync flow steps based on edges/doughs/extras settings
  const syncFlowSteps = async (categoryId: string) => {
    if (!storeId) return;

    // Check if flow steps exist for this category
    const { data: existingSteps } = await supabase
      .from("pizza_flow_steps")
      .select("*")
      .eq("category_id", categoryId);

    // Define default flow steps
    const defaultFlowSteps = [
      { step_type: 'size', step_order: 1, is_enabled: true, next_step_id: 'flavor', position_x: 50, position_y: 200 },
      { step_type: 'flavor', step_order: 2, is_enabled: true, next_step_id: 'edge', position_x: 300, position_y: 200 },
      { step_type: 'edge', step_order: 3, is_enabled: hasEdges === "yes", next_step_id: 'dough', position_x: 550, position_y: 100 },
      { step_type: 'dough', step_order: 4, is_enabled: hasDoughs === "yes", next_step_id: 'drink', position_x: 550, position_y: 300 },
      { step_type: 'drink', step_order: 5, is_enabled: true, next_step_id: 'cart', position_x: 800, position_y: 200 },
      { step_type: 'cart', step_order: 6, is_enabled: true, next_step_id: null, position_x: 1050, position_y: 200 },
    ];

    if (existingSteps && existingSteps.length > 0) {
      // Update existing steps to sync edge/dough enabled state
      for (const step of existingSteps) {
        let shouldUpdate = false;
        let newEnabled = step.is_enabled;

        // If user set "no" for edges, disable edge step in flow
        if (step.step_type === 'edge' && hasEdges === "no") {
          newEnabled = false;
          shouldUpdate = true;
        }
        // If user set "no" for doughs, disable dough step in flow
        if (step.step_type === 'dough' && hasDoughs === "no") {
          newEnabled = false;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await supabase
            .from("pizza_flow_steps")
            .update({ is_enabled: newEnabled })
            .eq("id", step.id);
        }
      }
    } else {
      // Create flow steps for new category
      const stepsToInsert = defaultFlowSteps.map(step => ({
        id: crypto.randomUUID(),
        store_id: storeId,
        category_id: categoryId,
        step_type: step.step_type,
        step_order: step.step_order,
        is_enabled: step.is_enabled,
        position_x: step.position_x,
        position_y: step.position_y,
      }));

      await supabase
        .from("pizza_flow_steps")
        .insert(stepsToInsert);
    }
  };

  const savePizzaOptionGroups = async (categoryId: string) => {
    if (!storeId) return;

    const validSizes = pizzaSizes.filter(s => s.name.trim());
    
    if (editId) {
      const { data: existingEdges } = await supabase
        .from("pizza_edges")
        .select("id")
        .eq("category_id", categoryId);
      
      if (existingEdges && existingEdges.length > 0) {
        const edgeIds = existingEdges.map(e => e.id);
        await supabase.from("pizza_edge_prices").delete().in("edge_id", edgeIds);
      }
      
      const { data: existingDoughs } = await supabase
        .from("pizza_doughs")
        .select("id")
        .eq("category_id", categoryId);
      
      if (existingDoughs && existingDoughs.length > 0) {
        const doughIds = existingDoughs.map(d => d.id);
        await supabase.from("pizza_dough_prices").delete().in("dough_id", doughIds);
      }
      
      await supabase.from("pizza_edges").delete().eq("category_id", categoryId);
      await supabase.from("pizza_doughs").delete().eq("category_id", categoryId);
      await supabase.from("pizza_sizes").delete().eq("category_id", categoryId);
    }
    
    const sizeIdMap: Record<string, string> = {};
    
    if (validSizes.length > 0) {
      const sizesToInsert = validSizes.map((size, index) => {
        const newId = crypto.randomUUID();
        sizeIdMap[size.id] = newId;
        return {
          id: newId,
          store_id: storeId,
          category_id: categoryId,
          name: size.name,
          slices: size.slices,
          max_flavors: size.flavors,
          min_flavors: 1,
          base_price: size.basePrice || 0,
          price_model: size.priceModel,
          image_url: size.image,
          is_active: !size.isOut,
          display_order: index,
        };
      });

      const { error: sizesError } = await supabase
        .from("pizza_sizes")
        .insert(sizesToInsert);

      if (sizesError) throw sizesError;
    }
    
    if (validSizes.length > 0) {
      const { data: sizesGroup, error: sizesGroupError } = await supabase
        .from("category_option_groups")
        .insert({
          store_id: storeId,
          category_id: categoryId,
          name: "Tamanho",
          selection_type: "single",
          is_required: true,
          is_primary: true,
          min_selections: 1,
          max_selections: 1,
          display_order: 0,
          display_mode: "modal",
          item_layout: "grid-2",
          show_item_images: true,
        })
        .select("id")
        .single();

      if (sizesGroupError) throw sizesGroupError;

      const sizeItems = validSizes.map((size, index) => ({
        store_id: storeId,
        group_id: sizesGroup.id,
        name: size.name,
        additional_price: size.basePrice || 0,
        display_order: index,
        is_active: !size.isOut,
      }));

      const { error: sizeItemsError } = await supabase
        .from("category_option_items")
        .insert(sizeItems);

      if (sizeItemsError) throw sizeItemsError;
    }

    const { error: saboresGroupError } = await supabase
      .from("category_option_groups")
      .insert({
        store_id: storeId,
        category_id: categoryId,
        name: "Sabor",
        selection_type: "single",
        is_required: true,
        is_primary: false,
        min_selections: 1,
        max_selections: 1,
        display_order: 1,
        display_mode: "modal",
        item_layout: "grid-2",
        show_item_images: true,
      });

    if (saboresGroupError) throw saboresGroupError;

    // Save Edges
    if (hasEdges === "yes" && pizzaEdges.length > 0) {
      const validEdges = pizzaEdges.filter(e => e.title.trim());
      if (validEdges.length > 0) {
        const edgesToInsert = validEdges.map((edge, index) => ({
          id: crypto.randomUUID(),
          store_id: storeId,
          category_id: categoryId,
          name: edge.title,
          is_active: !edge.isOut,
          display_order: index,
        }));

        const { data: insertedEdges, error: edgesError } = await supabase
          .from("pizza_edges")
          .insert(edgesToInsert)
          .select("id");

        if (edgesError) throw edgesError;

        const edgePricesToInsert: any[] = [];
        validEdges.forEach((edge, edgeIndex) => {
          const insertedEdgeId = insertedEdges?.[edgeIndex]?.id;
          if (!insertedEdgeId) return;

          edge.prices.forEach((price) => {
            const newSizeId = sizeIdMap[price.sizeId];
            if (newSizeId) {
              edgePricesToInsert.push({
                edge_id: insertedEdgeId,
                size_id: newSizeId,
                price: parseFloat(price.price) || 0,
                is_available: price.enabled,
              });
            }
          });
        });

        if (edgePricesToInsert.length > 0) {
          const { error: edgePricesError } = await supabase
            .from("pizza_edge_prices")
            .insert(edgePricesToInsert);

          if (edgePricesError) throw edgePricesError;
        }

        const { data: edgesGroup, error: edgesGroupError } = await supabase
          .from("category_option_groups")
          .insert({
            store_id: storeId,
            category_id: categoryId,
            name: "Borda",
            selection_type: "single",
            is_required: edgesRequired === "required",
            is_primary: false,
            min_selections: edgesRequired === "required" ? 1 : 0,
            max_selections: 1,
            display_order: 3,
            display_mode: "modal",
            item_layout: "list",
            show_item_images: false,
          })
          .select("id")
          .single();

        if (edgesGroupError) throw edgesGroupError;

        const edgeItems = validEdges.map((edge, index) => {
          const enabledPrice = edge.prices.find(p => p.enabled);
          return {
            store_id: storeId,
            group_id: edgesGroup.id,
            name: edge.title,
            additional_price: enabledPrice ? parseFloat(enabledPrice.price) || 0 : 0,
            display_order: index,
            is_active: !edge.isOut,
          };
        });

        const { error: edgeItemsError } = await supabase
          .from("category_option_items")
          .insert(edgeItems);

        if (edgeItemsError) throw edgeItemsError;
      }
    }

    // Save Doughs
    if (hasDoughs === "yes" && pizzaDoughs.length > 0) {
      const validDoughs = pizzaDoughs.filter(d => d.title.trim());
      if (validDoughs.length > 0) {
        const doughsToInsert = validDoughs.map((dough, index) => ({
          id: crypto.randomUUID(),
          store_id: storeId,
          category_id: categoryId,
          name: dough.title,
          is_active: !dough.isOut,
          display_order: index,
        }));

        const { data: insertedDoughs, error: doughsError } = await supabase
          .from("pizza_doughs")
          .insert(doughsToInsert)
          .select("id");

        if (doughsError) throw doughsError;

        const doughPricesToInsert: any[] = [];
        validDoughs.forEach((dough, doughIndex) => {
          const insertedDoughId = insertedDoughs?.[doughIndex]?.id;
          if (!insertedDoughId) return;

          dough.prices.forEach((price) => {
            const newSizeId = sizeIdMap[price.sizeId];
            if (newSizeId) {
              doughPricesToInsert.push({
                dough_id: insertedDoughId,
                size_id: newSizeId,
                price: parseFloat(price.price) || 0,
                is_available: price.enabled,
              });
            }
          });
        });

        if (doughPricesToInsert.length > 0) {
          const { error: doughPricesError } = await supabase
            .from("pizza_dough_prices")
            .insert(doughPricesToInsert);

          if (doughPricesError) throw doughPricesError;
        }

        const { data: doughsGroup, error: doughsGroupError } = await supabase
          .from("category_option_groups")
          .insert({
            store_id: storeId,
            category_id: categoryId,
            name: "Massa",
            selection_type: "single",
            is_required: doughsRequired === "required",
            is_primary: false,
            min_selections: doughsRequired === "required" ? 1 : 0,
            max_selections: 1,
            display_order: 4,
            display_mode: "modal",
            item_layout: "list",
            show_item_images: false,
          })
          .select("id")
          .single();

        if (doughsGroupError) throw doughsGroupError;

        const doughItems = validDoughs.map((dough, index) => {
          const enabledPrice = dough.prices.find(p => p.enabled);
          return {
            store_id: storeId,
            group_id: doughsGroup.id,
            name: dough.title,
            additional_price: enabledPrice ? parseFloat(enabledPrice.price) || 0 : 0,
            display_order: index,
            is_active: !dough.isOut,
          };
        });

        const { error: doughItemsError } = await supabase
          .from("category_option_items")
          .insert(doughItems);

        if (doughItemsError) throw doughItemsError;
      }
    }

    // Save Extras
    if (hasExtras === "yes" && pizzaExtras.length > 0) {
      const validExtras = pizzaExtras.filter(e => e.title.trim());
      if (validExtras.length > 0) {
        const { data: extrasGroup, error: extrasGroupError } = await supabase
          .from("category_option_groups")
          .insert({
            store_id: storeId,
            category_id: categoryId,
            name: "Adicionais",
            selection_type: "multiple",
            is_required: extrasRequired === "required",
            is_primary: false,
            min_selections: extrasRequired === "required" ? extrasMin : 0,
            max_selections: extrasMax,
            display_order: 5,
            display_mode: "modal",
            item_layout: "list",
            show_item_images: false,
          })
          .select("id")
          .single();

        if (extrasGroupError) throw extrasGroupError;

        const extraItems = validExtras.map((extra, index) => {
          const enabledPrice = extra.prices.find(p => p.enabled);
          return {
            store_id: storeId,
            group_id: extrasGroup.id,
            name: extra.title,
            additional_price: enabledPrice ? parseFloat(enabledPrice.price) || 0 : 0,
            display_order: index,
            is_active: !extra.isOut,
          };
        });

        const { error: extraItemsError } = await supabase
          .from("category_option_items")
          .insert(extraItems);

        if (extraItemsError) throw extraItemsError;
      }
    }
  };

  const handleClose = () => navigate("/dashboard/products");

  const isPizza = modelo === "pizza";

  // Category Form Content
  const CategoryFormContent = (
    <div className="space-y-5">
      {/* Modelo + Nome */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Modelo</Label>
          <Select value={modelo} onValueChange={(v) => setModelo(v as "padrao" | "pizza")}>
            <SelectTrigger className="w-[100px] h-9 text-sm border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="padrao">Padrão</SelectItem>
              <SelectItem value="pizza">Pizza</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex-1">
          <Label className="text-xs font-medium text-foreground">Nome da categoria *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isPizza ? "Ex.: Pizzas Salgadas" : "Ex.: Bebidas"}
            className="h-9 text-sm border-border bg-background"
          />
        </div>
      </div>

      {/* Promoção */}
      <div className="flex items-center gap-3">
        <Switch
          checked={isPromotion}
          onCheckedChange={(checked) => {
            if (checked) {
              setShowPromotionModal(true);
            } else {
              setIsPromotion(false);
              setPromotionMessage("");
            }
          }}
          className="data-[state=checked]:bg-primary scale-90"
        />
        <Label className="text-sm font-medium text-foreground">Promoção</Label>
        {isPromotion && promotionMessage && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
            {promotionMessage}
          </Badge>
        )}
      </div>

      {/* Disponibilidade */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground">Disponibilidade</Label>
        
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                availability === "always" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => setAvailability("always")}
            >
              {availability === "always" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm text-foreground" onClick={() => setAvailability("always")}>Sempre disponível</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                availability === "paused" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => setAvailability("paused")}
            >
              {availability === "paused" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm text-destructive" onClick={() => setAvailability("paused")}>Pausado</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div 
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                availability === "scheduled" ? "border-primary bg-primary" : "border-muted-foreground"
              )}
              onClick={() => setAvailability("scheduled")}
            >
              {availability === "scheduled" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm text-foreground" onClick={() => setAvailability("scheduled")}>Horários específicos</span>
          </label>
        </div>

        {availability === "scheduled" && (
          <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 border border-border">
            {schedules.map((schedule, scheduleIndex) => (
              <div key={scheduleIndex} className="flex flex-wrap items-center gap-2">
                <div className="flex gap-0.5">
                  {DAYS.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(scheduleIndex, day.key)}
                      className={cn(
                        "w-7 h-7 rounded-full text-xs font-medium transition-colors",
                        schedule.days.includes(day.key)
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-muted-foreground hover:border-primary"
                      )}
                      title={day.label}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => {
                      const newSchedules = [...schedules];
                      newSchedules[scheduleIndex].startTime = e.target.value;
                      setSchedules(newSchedules);
                    }}
                    className="w-20 h-8 text-xs border-border bg-card"
                  />
                  <span className="text-xs text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => {
                      const newSchedules = [...schedules];
                      newSchedules[scheduleIndex].endTime = e.target.value;
                      setSchedules(newSchedules);
                    }}
                    className="w-20 h-8 text-xs border-border bg-card"
                  />
                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSchedule(scheduleIndex)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSchedule}
              className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Horário
            </button>
          </div>
        )}
      </div>

      {/* Canais de venda */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground">Exibição por canais</Label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={channels.all}
              onCheckedChange={(checked) => handleChannelChange("all", !!checked)}
              className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm text-foreground">Todos os canais</span>
          </label>

          <div className="ml-5 space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={channels.pdv}
                onCheckedChange={(checked) => handleChannelChange("pdv", !!checked)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-xs text-foreground">PDV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={channels.cardapioDigital}
                onCheckedChange={(checked) => handleChannelChange("cardapioDigital", !!checked)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-xs text-foreground">Cardápio Digital</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-muted-foreground/20 animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-32 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-3 w-48 bg-muted-foreground/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-10 bg-card rounded animate-pulse" />
            <div className="h-32 bg-card rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Pizza mode
  if (isPizza) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                {editId ? "Editar categoria" : "Nova categoria"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Gestor de cardápio › Categoria Pizza
              </p>
            </div>
          </div>
        </div>

        {/* Steps - Horizontal */}
        <div className="bg-card border-b border-border px-4">
          <div className="flex gap-2 overflow-x-auto max-w-3xl mx-auto py-1">
            {PIZZA_STEPS.map((step) => {
              const isCurrent = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              const isDisabled = !editId && step.id > currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (editId || step.id <= currentStep) setCurrentStep(step.id);
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap border-b-2",
                    isCurrent ? "text-primary border-primary" 
                      : isCompleted || editId ? "text-foreground border-transparent cursor-pointer hover:text-primary"
                      : "text-muted-foreground border-transparent cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold",
                    isCurrent ? "bg-primary text-primary-foreground"
                      : isCompleted || editId ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {step.id}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto pb-20 bg-background">
          <div className="max-w-3xl mx-auto p-4">
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                {currentStep}. {PIZZA_STEPS.find(s => s.id === currentStep)?.label}
              </h2>

              {currentStep === 1 && CategoryFormContent}
              
              {currentStep === 2 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Defina os tamanhos de pizza. Pressione Enter para adicionar novo tamanho.
                  </p>

                  {/* Header Labels */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground px-8">
                    <span className="flex-1">Nome</span>
                    <span className="w-24">Preço Base</span>
                    <span className="w-20 text-center">Fatias</span>
                    <span className="w-24 text-center">Sabores</span>
                    <span className="w-28">Precificação</span>
                    <span className="w-10 text-center">Ativo</span>
                    <span className="w-8"></span>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={pizzaSizes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {pizzaSizes.map((size, index) => (
                          <CompactPizzaSizeItem
                            key={size.id}
                            size={size}
                            onUpdate={updatePizzaSize}
                            onIncrement={incrementValue}
                            onDecrement={decrementValue}
                            onRemove={removePizzaSize}
                            canRemove={pizzaSizes.length > 1}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <button
                    type="button"
                    onClick={addPizzaSize}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar tamanho
                  </button>
                </div>
              )}
              
              {currentStep === 3 && (
                <div className="space-y-4">
                  {/* Has Edges Toggle */}
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-foreground">Tem bordas?</Label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            hasEdges === "yes" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                          onClick={() => setHasEdges("yes")}
                        >
                          {hasEdges === "yes" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            hasEdges === "no" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                          onClick={() => setHasEdges("no")}
                        >
                          {hasEdges === "no" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                  </div>

                  {hasEdges === "no" && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      A etapa de bordas será desativada automaticamente no fluxo de pedido.
                    </p>
                  )}

                  {hasEdges === "yes" && (
                    <>
                      {/* Required Toggle */}
                      <div className="flex items-center gap-4">
                        <Label className="text-xs text-muted-foreground">Bordas são:</Label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div 
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                                edgesRequired === "optional" ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                              onClick={() => setEdgesRequired("optional")}
                            >
                              {edgesRequired === "optional" && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                            </div>
                            <span className="text-xs">Opcionais</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div 
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                                edgesRequired === "required" ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                              onClick={() => setEdgesRequired("required")}
                            >
                              {edgesRequired === "required" && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                            </div>
                            <span className="text-xs">Obrigatórias</span>
                          </label>
                        </div>
                      </div>

                      {/* Edges List */}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEdgeDragEnd}>
                        <SortableContext items={pizzaEdges.map(e => e.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {pizzaEdges.map((edge) => (
                              <CompactPizzaOptionItem
                                key={edge.id}
                                option={edge}
                                onUpdate={updatePizzaEdge}
                                onUpdatePrice={updateEdgePrice}
                                onRemove={removePizzaEdge}
                                canRemove={pizzaEdges.length > 1}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <button
                        type="button"
                        onClick={addPizzaEdge}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar borda
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {currentStep === 4 && (
                <div className="space-y-4">
                  {/* Has Doughs Toggle */}
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-foreground">Tem massas?</Label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            hasDoughs === "yes" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                          onClick={() => setHasDoughs("yes")}
                        >
                          {hasDoughs === "yes" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            hasDoughs === "no" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                          onClick={() => setHasDoughs("no")}
                        >
                          {hasDoughs === "no" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                  </div>

                  {hasDoughs === "no" && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      A etapa de massas será desativada automaticamente no fluxo de pedido.
                    </p>
                  )}

                  {hasDoughs === "yes" && (
                    <>
                      {/* Required Toggle */}
                      <div className="flex items-center gap-4">
                        <Label className="text-xs text-muted-foreground">Massas são:</Label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div 
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                                doughsRequired === "optional" ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                              onClick={() => setDoughsRequired("optional")}
                            >
                              {doughsRequired === "optional" && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                            </div>
                            <span className="text-xs">Opcionais</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div 
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                                doughsRequired === "required" ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                              onClick={() => setDoughsRequired("required")}
                            >
                              {doughsRequired === "required" && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                            </div>
                            <span className="text-xs">Obrigatórias</span>
                          </label>
                        </div>
                      </div>

                      {/* Doughs List */}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDoughDragEnd}>
                        <SortableContext items={pizzaDoughs.map(d => d.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {pizzaDoughs.map((dough) => (
                              <CompactPizzaOptionItem
                                key={dough.id}
                                option={dough}
                                onUpdate={updatePizzaDough}
                                onUpdatePrice={updateDoughPrice}
                                onRemove={removePizzaDough}
                                canRemove={pizzaDoughs.length > 1}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <button
                        type="button"
                        onClick={addPizzaDough}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar massa
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {currentStep === 5 && (
                <div className="space-y-4">
                  {/* Has Extras Toggle */}
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-foreground">Tem adicionais?</Label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            hasExtras === "yes" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                          onClick={() => setHasExtras("yes")}
                        >
                          {hasExtras === "yes" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            hasExtras === "no" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                          onClick={() => setHasExtras("no")}
                        >
                          {hasExtras === "no" && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                  </div>

                  {hasExtras === "yes" && (
                    <>
                      {/* Required + Min/Max */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Label className="text-xs text-muted-foreground">Adicionais são:</Label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div 
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                                extrasRequired === "optional" ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                              onClick={() => setExtrasRequired("optional")}
                            >
                              {extrasRequired === "optional" && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                            </div>
                            <span className="text-xs">Opcionais</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <div 
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                                extrasRequired === "required" ? "border-primary bg-primary" : "border-muted-foreground"
                              )}
                              onClick={() => setExtrasRequired("required")}
                            >
                              {extrasRequired === "required" && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                            </div>
                            <span className="text-xs">Obrigatórios</span>
                          </label>
                        </div>

                        {/* Min/Max */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Mín:</Label>
                          <Input
                            type="number"
                            min="0"
                            value={extrasMin}
                            onChange={(e) => setExtrasMin(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-14 h-7 text-xs text-center"
                          />
                          <Label className="text-xs text-muted-foreground">Máx:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={extrasMax}
                            onChange={(e) => setExtrasMax(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-14 h-7 text-xs text-center"
                          />
                        </div>
                      </div>

                      {/* Extras List */}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExtrasDragEnd}>
                        <SortableContext items={pizzaExtras.map(e => e.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {pizzaExtras.map((extra) => (
                              <CompactPizzaOptionItem
                                key={extra.id}
                                option={extra}
                                onUpdate={updatePizzaExtra}
                                onUpdatePrice={updateExtraPrice}
                                onRemove={removePizzaExtra}
                                canRemove={pizzaExtras.length > 1}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <button
                        type="button"
                        onClick={addPizzaExtra}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar adicional
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-background dark:bg-card border-t border-border px-4 py-3 z-20">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-9 px-4 text-sm"
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="h-9 px-4 text-sm"
                >
                  Voltar
                </Button>
              )}
              
              {currentStep < 5 ? (
                <Button 
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="h-9 px-4 text-sm bg-primary hover:bg-primary/90"
                  disabled={currentStep === 1 && !name.trim()}
                >
                  Próximo
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={loading || !name.trim()}
                    className="h-9 px-4 text-sm border-primary text-primary hover:bg-primary/10"
                  >
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    onClick={() => handleSave(true)}
                    disabled={loading || !name.trim()}
                    className="h-9 px-4 text-sm bg-primary hover:bg-primary/90"
                  >
                    {loading ? "Salvando..." : "Salvar e criar itens"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Promotion Modal */}
        <Dialog open={showPromotionModal} onOpenChange={setShowPromotionModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Definir Promoção</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <p className="text-xs text-muted-foreground">
                Informe a porcentagem de desconto
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={promotionPercent}
                  onChange={(e) => setPromotionPercent(e.target.value)}
                  placeholder="Ex: 10"
                  className="flex-1"
                  autoFocus
                />
                <span className="text-lg font-medium">%</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPromotionModal(false);
                  setPromotionPercent("");
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const percent = parseInt(promotionPercent);
                  if (percent >= 1 && percent <= 100) {
                    setIsPromotion(true);
                    setPromotionMessage(`${percent}% OFF`);
                    setShowPromotionModal(false);
                    setPromotionPercent("");
                  }
                }}
                disabled={!promotionPercent || parseInt(promotionPercent) < 1 || parseInt(promotionPercent) > 100}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Standard mode
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {editId ? "Editar categoria" : "Nova categoria"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestor de cardápio › Categoria
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-xl mx-auto p-4">
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Categoria</h2>
            {CategoryFormContent}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background dark:bg-card border-t border-border px-4 py-3 z-20">
        <div className="flex items-center justify-end max-w-xl mx-auto gap-2">
          <Button variant="outline" onClick={handleClose} className="h-9 px-4 text-sm" disabled={loading}>
            Cancelar
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={loading || !name.trim()}
            className="h-9 px-4 text-sm border-primary text-primary hover:bg-primary/10"
          >
            {loading ? "Salvando..." : "Salvar"}
          </Button>
          
          <Button
            onClick={() => handleSave(true)}
            disabled={loading || !name.trim()}
            className="h-9 px-4 text-sm bg-primary hover:bg-primary/90"
          >
            {loading ? "Salvando..." : "Salvar e criar itens"}
          </Button>
        </div>
      </div>

      <Dialog open={showPromotionModal} onOpenChange={setShowPromotionModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Definir Promoção</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-xs text-muted-foreground">
              Informe a porcentagem de desconto
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                value={promotionPercent}
                onChange={(e) => setPromotionPercent(e.target.value)}
                placeholder="Ex: 10"
                className="flex-1"
                autoFocus
              />
              <span className="text-lg font-medium">%</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPromotionModal(false);
                setPromotionPercent("");
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const percent = parseInt(promotionPercent);
                if (percent >= 1 && percent <= 100) {
                  setIsPromotion(true);
                  setPromotionMessage(`${percent}% OFF`);
                  setShowPromotionModal(false);
                  setPromotionPercent("");
                }
              }}
              disabled={!promotionPercent || parseInt(promotionPercent) < 1 || parseInt(promotionPercent) > 100}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
