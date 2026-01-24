// Hook for managing pizza customization flow in storefront
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { Category, Product } from "./useStorefrontData";

export interface PizzaSize {
  id: string;
  name: string;
  maxFlavors: number;
  categoryId: string;
  basePrice: number;
  imageUrl: string | null;
}

export interface PizzaFlavors {
  flavors: { id: string; name: string; price: number; surcharge: number; flavor_type: string }[];
  totalPrice: number;
}

export interface PizzaEdge {
  id: string;
  name: string;
  price: number;
}

export interface PizzaDough {
  id: string;
  name: string;
  price: number;
}

export function useStorefrontPizzaFlow(
  flowStepsData: Record<string, Record<string, { is_enabled: boolean; next_step_id: string | null }>>,
  activeCategoryData: Category | undefined,
  isStoreOpen: boolean
) {
  const { addToCart } = useCart();
  
  // Pizza selection state
  const [showPizzaFlavorDrawer, setShowPizzaFlavorDrawer] = useState(false);
  const [showPizzaDoughDrawer, setShowPizzaDoughDrawer] = useState(false);
  const [selectedPizzaSize, setSelectedPizzaSize] = useState<PizzaSize | null>(null);
  const [selectedPizzaFlavors, setSelectedPizzaFlavors] = useState<PizzaFlavors | null>(null);
  const [selectedPizzaEdge, setSelectedPizzaEdge] = useState<PizzaEdge | null>(null);
  const [selectedPizzaDough, setSelectedPizzaDough] = useState<PizzaDough | null>(null);
  
  // Upsell modal state
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellTriggerCategoryId, setUpsellTriggerCategoryId] = useState<string | null>(null);

  // Use ref for latest flowStepsData
  const flowStepsDataRef = useRef(flowStepsData);
  useEffect(() => {
    flowStepsDataRef.current = flowStepsData;
  }, [flowStepsData]);

  // Helper to check if a flow step is enabled
  const isStepEnabled = useCallback((categoryId: string, stepType: string): boolean => {
    const data = flowStepsDataRef.current;
    const categorySteps = data[categoryId];
    if (!categorySteps) return true;
    const stepData = categorySteps[stepType];
    if (!stepData) return true;
    return stepData.is_enabled;
  }, []);

  // Helper to get the next step
  const getNextStep = useCallback((categoryId: string, currentStepType: string): string | null => {
    const data = flowStepsDataRef.current;
    const categorySteps = data[categoryId];
    if (!categorySteps) return null;
    const stepData = categorySteps[currentStepType];
    if (!stepData) return null;
    return stepData.next_step_id;
  }, []);

  // Helper to navigate to the next enabled step
  const navigateToNextStep = useCallback((categoryId: string, currentStepType: string): string | null => {
    let nextStep = getNextStep(categoryId, currentStepType);
    while (nextStep && nextStep !== 'cart') {
      if (isStepEnabled(categoryId, nextStep)) {
        return nextStep;
      }
      nextStep = getNextStep(categoryId, nextStep);
    }
    return nextStep;
  }, [getNextStep, isStepEnabled]);

  // Open step drawer based on step type
  const openStepDrawer = useCallback((
    stepType: string | null,
    flavors: PizzaFlavors | null,
    edge: PizzaEdge | null,
    dough: PizzaDough | null
  ) => {
    if (!selectedPizzaSize || !activeCategoryData) return;

    if (stepType === 'dough') {
      setShowPizzaDoughDrawer(true);
      return;
    }

    if (stepType === 'cart' || stepType === null) {
      // Finalize pizza order
      const flavorNames = (flavors?.flavors || []).map(f => f.name).join(" + ");
      const edgePrice = edge?.price || 0;
      const doughPrice = dough?.price || 0;
      const finalPrice = (flavors?.totalPrice || 0) + edgePrice + doughPrice;
      
      const descriptionParts = [flavorNames];
      if (edge) descriptionParts.push(`Borda: ${edge.name}`);
      if (dough) descriptionParts.push(`Massa: ${dough.name}`);
      
      addToCart({
        id: `pizza-${selectedPizzaSize.id}-${Date.now()}`,
        name: `${activeCategoryData.name} ${selectedPizzaSize.name}`,
        price: finalPrice,
        quantity: 1,
        category: activeCategoryData.name,
        description: descriptionParts.join(" • "),
      });

      // Show upsell modal
      setUpsellTriggerCategoryId(selectedPizzaSize.categoryId);
      setShowUpsellModal(true);
    }
  }, [selectedPizzaSize, activeCategoryData, addToCart]);

  // Pizza size selection handler
  const handlePizzaSizeSelect = useCallback((
    sizeId: string,
    sizeName: string,
    maxFlavors: number,
    basePrice: number,
    imageUrl: string | null
  ) => {
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado");
      return;
    }
    
    if (activeCategoryData) {
      setSelectedPizzaSize({
        id: sizeId,
        name: sizeName,
        maxFlavors,
        categoryId: activeCategoryData.id,
        basePrice,
        imageUrl,
      });
      setShowPizzaFlavorDrawer(true);
    }
  }, [isStoreOpen, activeCategoryData]);

  // Pizza flavor selection complete handler
  const handlePizzaFlavorComplete = useCallback((
    flavors: { id: string; name: string; price: number; surcharge: number; flavor_type: string }[],
    totalPrice: number,
    edge?: PizzaEdge | null
  ) => {
    if (!selectedPizzaSize || !activeCategoryData) return;

    const flavorsData: PizzaFlavors = { flavors, totalPrice };
    setSelectedPizzaFlavors(flavorsData);
    setSelectedPizzaEdge(edge || null);

    // Get the next enabled step
    setTimeout(() => {
      const nextStep = navigateToNextStep(activeCategoryData.id, 'flavor');
      openStepDrawer(nextStep, flavorsData, edge || null, null);
    }, 150);
  }, [selectedPizzaSize, activeCategoryData, navigateToNextStep, openStepDrawer]);

  // Finalize pizza order directly (from flavor drawer with all options)
  const finalizePizzaOrderDirect = useCallback((
    flavors: { id: string; name: string; price: number; surcharge: number; flavor_type: string }[],
    totalPrice: number,
    edge?: PizzaEdge | null,
    drink?: { id: string; name: string; price: number; promotional_price: number | null; image_url: string | null } | null,
    notes?: string
  ) => {
    if (!selectedPizzaSize || !activeCategoryData) return;

    const flavorNames = flavors.map(f => f.name).join(" + ");
    const edgePrice = edge?.price || 0;
    const finalPrice = totalPrice + edgePrice;
    
    const descriptionParts = [flavorNames];
    if (edge) descriptionParts.push(`Borda: ${edge.name}`);
    if (notes) descriptionParts.push(`Obs: ${notes}`);
    
    addToCart({
      id: `pizza-${selectedPizzaSize.id}-${Date.now()}`,
      name: `${activeCategoryData.name} ${selectedPizzaSize.name}`,
      price: finalPrice,
      quantity: 1,
      category: activeCategoryData.name,
      description: descriptionParts.join(" • "),
    });

    if (drink) {
      addToCart({
        id: drink.id,
        name: drink.name,
        price: drink.promotional_price ?? drink.price,
        quantity: 1,
        category: "Bebidas",
      });
    }

    setUpsellTriggerCategoryId(selectedPizzaSize.categoryId);
    setShowUpsellModal(true);
  }, [selectedPizzaSize, activeCategoryData, addToCart]);

  // Pizza dough selection complete handler
  const handlePizzaDoughComplete = useCallback((dough: { id: string; name: string; description: string | null; price: number } | null) => {
    if (!selectedPizzaSize || !activeCategoryData || !selectedPizzaFlavors) return;

    const doughData = dough ? { id: dough.id, name: dough.name, price: dough.price } : null;
    setSelectedPizzaDough(doughData);
    setShowPizzaDoughDrawer(false);
    
    setTimeout(() => {
      const nextStep = navigateToNextStep(activeCategoryData.id, 'dough');
      openStepDrawer(nextStep, selectedPizzaFlavors, selectedPizzaEdge, doughData);
    }, 150);
  }, [selectedPizzaSize, activeCategoryData, selectedPizzaFlavors, selectedPizzaEdge, navigateToNextStep, openStepDrawer]);

  // Upsell handlers
  const handleUpsellClose = useCallback(() => {
    setShowUpsellModal(false);
    setUpsellTriggerCategoryId(null);
    setShowPizzaFlavorDrawer(false);
    setShowPizzaDoughDrawer(false);
    setSelectedPizzaSize(null);
    setSelectedPizzaFlavors(null);
    setSelectedPizzaEdge(null);
    setSelectedPizzaDough(null);
  }, []);

  const handleUpsellBack = useCallback(() => {
    setShowUpsellModal(false);
    setUpsellTriggerCategoryId(null);
  }, []);

  // Reset pizza state
  const resetPizzaState = useCallback(() => {
    setShowPizzaFlavorDrawer(false);
    setShowPizzaDoughDrawer(false);
    setSelectedPizzaSize(null);
    setSelectedPizzaFlavors(null);
    setSelectedPizzaEdge(null);
    setSelectedPizzaDough(null);
  }, []);

  return {
    // State
    showPizzaFlavorDrawer,
    setShowPizzaFlavorDrawer,
    showPizzaDoughDrawer,
    setShowPizzaDoughDrawer,
    selectedPizzaSize,
    setSelectedPizzaSize,
    selectedPizzaFlavors,
    setSelectedPizzaFlavors,
    selectedPizzaEdge,
    setSelectedPizzaEdge,
    selectedPizzaDough,
    showUpsellModal,
    setShowUpsellModal,
    upsellTriggerCategoryId,
    setUpsellTriggerCategoryId,
    
    // Handlers
    handlePizzaSizeSelect,
    handlePizzaFlavorComplete,
    handlePizzaDoughComplete,
    finalizePizzaOrderDirect,
    handleUpsellClose,
    handleUpsellBack,
    resetPizzaState,
    
    // Helpers
    isStepEnabled,
    navigateToNextStep,
  };
}
