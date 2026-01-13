import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { OptionItem, ProductVariation, getItemPrice, OptionGroup } from "./usePDVData";
import { AppliedReward } from "@/components/pdv/PDVLoyaltyRedemption";
import { SplitPayment } from "@/components/pdv/PDVPaymentSection";
import { ManualDiscount } from "@/components/pdv/PDVManualDiscount";

export interface SelectedComplement {
  item: OptionItem;
  quantity: number;
}

export interface CartItem {
  id: string;
  item: OptionItem;
  quantity: number;
  complements: SelectedComplement[];
  notes?: string;
  selectedVariation?: ProductVariation;
}

export function usePDVCart(
  getSecondaryGroups: (categoryId: string) => OptionGroup[],
  getGroupItems: (groupId: string) => OptionItem[],
  allOptionItems: OptionItem[]
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Cliente Balcão");
  
  // Complements modal
  const [isComplementsOpen, setIsComplementsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OptionItem | null>(null);
  const [selectedComplements, setSelectedComplements] = useState<Map<string, number>>(new Map());
  
  // Variations modal
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [productForVariation, setProductForVariation] = useState<OptionItem | null>(null);
  
  // Loyalty
  const [appliedReward, setAppliedReward] = useState<AppliedReward | null>(null);
  const [cpfForPoints, setCpfForPoints] = useState<string | null>(null);
  
  // Split Payment
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  
  // Manual Discount
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  
  // Table release option
  const [releaseTableAfterOrder, setReleaseTableAfterOrder] = useState(true);

  const addToCartDirect = useCallback((product: OptionItem, complements: SelectedComplement[]) => {
    setCart(prev => [...prev, { 
      id: crypto.randomUUID(), 
      item: product, 
      quantity: 1,
      complements 
    }]);
    toast.success(`${product.name} adicionado!`);
  }, []);
  
  const addToCartWithVariation = useCallback((product: OptionItem, variation: ProductVariation) => {
    const itemWithVariation: OptionItem = {
      ...product,
      additional_price: variation.price,
    };
    
    setCart(prev => [...prev, { 
      id: crypto.randomUUID(), 
      item: itemWithVariation, 
      quantity: 1,
      complements: [],
      selectedVariation: variation,
    }]);
    
    toast.success(`${product.name} (${variation.name}) adicionado!`);
    setIsVariationsOpen(false);
    setProductForVariation(null);
  }, []);

  const openComplementsModal = useCallback((item: OptionItem) => {
    // Inventory products - add directly (no variations or complements)
    if (item.id.startsWith('inv-')) {
      addToCartDirect(item, []);
      return;
    }
    
    // Regular products with variations - open variations modal
    if (item.id.startsWith('prod-') && item.variations && item.variations.length > 0) {
      setProductForVariation(item);
      setIsVariationsOpen(true);
      return;
    }
    
    // Regular products without variations - add directly
    if (item.id.startsWith('prod-')) {
      addToCartDirect(item, []);
      return;
    }
    
    const secondaryGroups = getSecondaryGroups(item.category_id || "");
    
    // If no secondary groups, add directly to cart
    if (secondaryGroups.length === 0) {
      addToCartDirect(item, []);
      return;
    }
    
    setSelectedProduct(item);
    setSelectedComplements(new Map());
    setIsComplementsOpen(true);
  }, [addToCartDirect, getSecondaryGroups]);

  const toggleComplement = useCallback((item: OptionItem, group: OptionGroup) => {
    setSelectedComplements(prev => {
      const next = new Map(prev);
      const currentQty = next.get(item.id) || 0;
      
      if (group.selection_type === "single") {
        // For single selection, clear other items in the same group first
        const groupItems = getGroupItems(group.id);
        groupItems.forEach(gi => {
          if (gi.id !== item.id) next.delete(gi.id);
        });
        // Toggle this item
        if (currentQty > 0) {
          next.delete(item.id);
        } else {
          next.set(item.id, 1);
        }
      } else {
        // For multiple selection, check max
        const groupItems = getGroupItems(group.id);
        const currentGroupTotal = groupItems.reduce((sum, gi) => sum + (next.get(gi.id) || 0), 0);
        
        if (currentQty > 0) {
          next.delete(item.id);
        } else if (!group.max_selections || currentGroupTotal < group.max_selections) {
          next.set(item.id, 1);
        } else {
          toast.error(`Máximo de ${group.max_selections} seleções para ${group.name}`);
        }
      }
      
      return next;
    });
  }, [getGroupItems]);

  const addComplementQuantity = useCallback((item: OptionItem, group: OptionGroup, delta: number) => {
    setSelectedComplements(prev => {
      const next = new Map(prev);
      const currentQty = next.get(item.id) || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        next.delete(item.id);
      } else {
        // Check max selections for the group
        const groupItems = getGroupItems(group.id);
        const currentGroupTotal = groupItems.reduce((sum, gi) => {
          if (gi.id === item.id) return sum;
          return sum + (next.get(gi.id) || 0);
        }, 0);
        
        if (group.max_selections && (currentGroupTotal + newQty) > group.max_selections) {
          toast.error(`Máximo de ${group.max_selections} seleções para ${group.name}`);
          return prev;
        }
        
        next.set(item.id, newQty);
      }
      
      return next;
    });
  }, [getGroupItems]);

  const confirmAddToCart = useCallback(() => {
    if (!selectedProduct) return;
    
    // Validate required groups
    const secondaryGroups = getSecondaryGroups(selectedProduct.category_id || "");
    for (const group of secondaryGroups) {
      if (group.is_required) {
        const groupItems = getGroupItems(group.id);
        const selectedCount = groupItems.reduce((sum, item) => sum + (selectedComplements.get(item.id) || 0), 0);
        if (selectedCount < group.min_selections) {
          toast.error(`Selecione pelo menos ${group.min_selections} em "${group.name}"`);
          return;
        }
      }
    }
    
    // Build complements array
    const complements: SelectedComplement[] = [];
    selectedComplements.forEach((qty, itemId) => {
      const item = allOptionItems.find(i => i.id === itemId);
      if (item && qty > 0) {
        complements.push({ item, quantity: qty });
      }
    });
    
    addToCartDirect(selectedProduct, complements);
    setIsComplementsOpen(false);
    setSelectedProduct(null);
    setSelectedComplements(new Map());
  }, [selectedProduct, getSecondaryGroups, getGroupItems, selectedComplements, allOptionItems, addToCartDirect]);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart(prev => {
      const cartItem = prev.find(i => i.id === itemId);
      if (!cartItem) return prev;
      
      const newQty = cartItem.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i);
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, notes } : i));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName("Cliente Balcão");
    setAppliedReward(null);
    setCpfForPoints(null);
    setSplitPayments([]);
    setManualDiscount(null);
    setReleaseTableAfterOrder(true);
  }, []);

  // Calculate cart item total (product + complements)
  const getCartItemTotal = useCallback((cartItem: CartItem): number => {
    const productPrice = getItemPrice(cartItem.item);
    const complementsPrice = cartItem.complements.reduce(
      (sum, c) => sum + getItemPrice(c.item) * c.quantity, 
      0
    );
    return (productPrice + complementsPrice) * cartItem.quantity;
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, cartItem) => sum + getCartItemTotal(cartItem), 0), [cart, getCartItemTotal]);
  const manualDiscountAmount = manualDiscount?.discountAmount || 0;
  const loyaltyDiscount = appliedReward?.discountAmount || 0;
  const totalDiscount = manualDiscountAmount + loyaltyDiscount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount);

  // Calculate complements total for modal
  const complementsTotal = useMemo(() => 
    Array.from(selectedComplements.entries()).reduce((sum, [itemId, qty]) => {
      const item = allOptionItems.find(i => i.id === itemId);
      return sum + (item ? getItemPrice(item) * qty : 0);
    }, 0), 
  [selectedComplements, allOptionItems]);

  return {
    cart,
    setCart,
    customerName,
    setCustomerName,
    isComplementsOpen,
    setIsComplementsOpen,
    selectedProduct,
    setSelectedProduct,
    selectedComplements,
    setSelectedComplements,
    isVariationsOpen,
    setIsVariationsOpen,
    productForVariation,
    setProductForVariation,
    appliedReward,
    setAppliedReward,
    cpfForPoints,
    setCpfForPoints,
    splitPayments,
    setSplitPayments,
    manualDiscount,
    setManualDiscount,
    releaseTableAfterOrder,
    setReleaseTableAfterOrder,
    openComplementsModal,
    toggleComplement,
    addComplementQuantity,
    confirmAddToCart,
    addToCartWithVariation,
    updateQuantity,
    removeFromCart,
    updateItemNotes,
    clearCart,
    getCartItemTotal,
    cartTotal,
    manualDiscountAmount,
    loyaltyDiscount,
    totalDiscount,
    finalTotal,
    complementsTotal,
  };
}
