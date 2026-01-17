// Enhanced Cart Context with stock validation
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ServiceType = 'delivery' | 'pickup' | 'dine_in';

export interface CartItem {
  id: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  description?: string;
  image_url?: string;
  size?: string;
  flavors?: Array<{
    name: string;
    ingredients?: string;
    isPremium?: boolean;
    surcharge?: number;
    price?: number;
  }>;
  extras?: {
    border?: { id: string; name: string; price: number } | null;
    toppings?: Array<{ id: string; name: string; price: number }>;
    specialSurcharges?: string[];
  };
  unit_base_price?: number;
}

export interface Address {
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  reference?: string;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  discountAmount: number;
}

export interface DeliveryAreaInfo {
  id: string;
  name: string;
  fee: number;
  min_order_value: number;
  estimated_time: number;
}

export interface IncompleteOrder {
  cart?: CartItem[];
  serviceType?: ServiceType;
  totalPrice?: number;
  deliveryFee?: number;
  finalTotal?: number;
  customerName?: string;
  customerPhone?: string;
  customerCpf?: string;
  address?: Address;
  tableNumber?: string;
  paymentMethod?: string;
  changeAmount?: number;
  observations?: string;
  coupon?: AppliedCoupon | null;
  deliveryArea?: DeliveryAreaInfo;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: CartItem) => Promise<boolean>;
  updateQuantity: (productId: string, newQuantity: number) => Promise<boolean>;
  updateCartItem: (updatedItem: CartItem) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  serviceType: ServiceType | null;
  setServiceType: (type: ServiceType) => void;
  totalItems: number;
  totalPrice: number;
  isCartLoaded: boolean;
  incompleteOrder: IncompleteOrder | null;
  updateIncompleteOrder: (data: Partial<IncompleteOrder>) => void;
  clearIncompleteOrder: () => void;
  validateCartStock: () => Promise<{ valid: boolean; invalidItems: string[] }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Helper to check stock for a product
async function checkProductStock(productId: string, requestedQty: number): Promise<{ valid: boolean; available: number; name: string }> {
  // Skip virtual products
  if (
    productId.startsWith('primary-option-') || 
    productId.startsWith('standard-size-') ||
    productId.startsWith('pizza-')
  ) {
    return { valid: true, available: 999, name: '' };
  }

  // Check inventory products
  if (productId.startsWith('inv-')) {
    const realId = productId.replace('inv-', '');
    const { data } = await supabase
      .from("inventory_products")
      .select("stock_quantity, name")
      .eq("id", realId)
      .maybeSingle();

    if (!data) return { valid: true, available: 999, name: '' };
    
    const available = data.stock_quantity || 0;
    return { 
      valid: requestedQty <= available, 
      available, 
      name: data.name 
    };
  }

  // Check regular products
  const { data } = await supabase
    .from("products")
    .select("has_stock_control, stock_quantity, name")
    .eq("id", productId)
    .maybeSingle();

  if (!data || !data.has_stock_control) {
    return { valid: true, available: 999, name: '' };
  }

  const available = data.stock_quantity || 0;
  return { 
    valid: requestedQty <= available, 
    available, 
    name: data.name 
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [serviceType, setServiceTypeState] = useState<ServiceType | null>(null);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  
  const [incompleteOrder, setIncompleteOrder] = useState<IncompleteOrder | null>(() => {
    try {
      const saved = localStorage.getItem('incompleteOrder');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('incompleteOrder');
      return null;
    }
  });

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCart(Array.isArray(parsed) ? parsed : []);
      }
      
      const savedService = localStorage.getItem('selectedService') as ServiceType | null;
      setServiceTypeState(savedService || 'delivery');
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      localStorage.removeItem('cart');
      localStorage.removeItem('selectedService');
      setServiceTypeState('delivery');
      setCart([]);
    } finally {
      setIsCartLoaded(true);
    }
  }, []);

  const debouncedSaveCart = useMemo(() => debounce((cartData: CartItem[]) => {
    if (isCartLoaded) {
      try {
        localStorage.setItem('cart', JSON.stringify(cartData));
      } catch (e) {
        console.error('Erro ao salvar carrinho:', e);
      }
    }
  }, 20), [isCartLoaded]);
  
  useEffect(() => { 
    if (isCartLoaded) {
      debouncedSaveCart(cart); 
    }
  }, [cart, debouncedSaveCart, isCartLoaded]);

  const setServiceType = useCallback((newServiceType: ServiceType) => {
    try {
      setServiceTypeState(newServiceType);
      localStorage.setItem('selectedService', newServiceType);
    } catch (e) {
      console.error('Erro ao salvar tipo de serviço:', e);
    }
  }, []);

  const addToCart = useCallback(async (product: CartItem): Promise<boolean> => {
    try {
      if (!product || !product.name || typeof product.price !== 'number') {
        console.error('Produto inválido:', product);
        return false;
      }

      const productId = product.product_id || product.id;
      
      // Find existing quantity in cart
      const existingItem = cart.find(item => item.id === product.id);
      const currentQty = existingItem?.quantity || 0;
      const newTotalQty = currentQty + 1;

      // Check stock
      const stockCheck = await checkProductStock(productId, newTotalQty);
      
      if (!stockCheck.valid) {
        if (stockCheck.available === 0) {
          toast.error(`"${stockCheck.name || product.name}" está esgotado`);
        } else {
          toast.error(`Apenas ${stockCheck.available} unidade(s) disponível(is) de "${stockCheck.name || product.name}"`);
        }
        return false;
      }

      setCart(prevCart => {
        if (product.category === 'pizzas') {
          const uniqueId = product.id || `pizza_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          return [...prevCart, { ...product, id: uniqueId, quantity: 1 }];
        }
        
        const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
        if (existingItemIndex >= 0) {
          const updatedCart = [...prevCart];
          updatedCart[existingItemIndex].quantity += 1;
          return updatedCart;
        }
        
        return [...prevCart, { ...product, quantity: 1 }];
      });

      return true;
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      return false;
    }
  }, [cart]);

  const updateQuantity = useCallback(async (productId: string, newQuantity: number): Promise<boolean> => {
    try {
      if (newQuantity <= 0) {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
        return true;
      }

      const item = cart.find(i => i.id === productId);
      if (!item) return false;

      const realProductId = item.product_id || item.id;
      
      // Check stock for the new quantity
      const stockCheck = await checkProductStock(realProductId, newQuantity);
      
      if (!stockCheck.valid) {
        toast.error(`Apenas ${stockCheck.available} unidade(s) disponível(is) de "${stockCheck.name || item.name}"`);
        return false;
      }

      setCart(prevCart => 
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );

      return true;
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      return false;
    }
  }, [cart]);

  const removeFromCart = useCallback((productId: string) => {
    try {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } catch (error) {
      console.error('Erro ao remover do carrinho:', error);
    }
  }, []);

  const updateCartItem = useCallback((updatedItem: CartItem) => {
    try {
      setCart(prevCart => prevCart.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
    }
  }, []);

  const clearCart = useCallback(() => {
    try {
      setCart([]);
      localStorage.removeItem('cart');
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
    }
  }, []);
  
  const updateIncompleteOrder = useCallback((data: Partial<IncompleteOrder>) => {
    try {
      setIncompleteOrder(prev => {
        const newState = { ...(prev || {}), ...data };
        localStorage.setItem('incompleteOrder', JSON.stringify(newState));
        return newState;
      });
    } catch (e) {
      console.error('Erro ao salvar pedido incompleto:', e);
    }
  }, []);

  const clearIncompleteOrder = useCallback(() => {
    try {
      setIncompleteOrder(null);
      localStorage.removeItem('incompleteOrder');
    } catch (error) {
      console.error('Erro ao limpar pedido incompleto:', error);
    }
  }, []);

  // Validate all items in cart have stock
  const validateCartStock = useCallback(async (): Promise<{ valid: boolean; invalidItems: string[] }> => {
    const invalidItems: string[] = [];
    
    for (const item of cart) {
      const productId = item.product_id || item.id;
      const stockCheck = await checkProductStock(productId, item.quantity);
      
      if (!stockCheck.valid) {
        invalidItems.push(item.name);
      }
    }
    
    if (invalidItems.length > 0) {
      toast.error(`Estoque insuficiente para: ${invalidItems.join(', ')}`);
    }
    
    return {
      valid: invalidItems.length === 0,
      invalidItems
    };
  }, [cart]);

  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.quantity || 1), 0), 
    [cart]
  );
  
  const totalPrice = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0), 
    [cart]
  );

  const value = useMemo(() => ({
    cart,
    addToCart,
    updateQuantity,
    updateCartItem,
    removeFromCart,
    clearCart,
    serviceType,
    setServiceType,
    totalItems,
    totalPrice,
    isCartLoaded,
    incompleteOrder,
    updateIncompleteOrder,
    clearIncompleteOrder,
    validateCartStock,
  }), [
    cart, addToCart, updateQuantity, updateCartItem, removeFromCart, clearCart, 
    setServiceType, serviceType, totalItems, totalPrice, isCartLoaded, 
    incompleteOrder, updateIncompleteOrder, clearIncompleteOrder, validateCartStock
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
