import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type ServiceType = 'delivery' | 'pickup' | 'dine_in';

export interface CartItem {
  id: string;
  product_id?: string; // ID original do produto para controle de estoque
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
  addToCart: (product: CartItem) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
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

  const addToCart = useCallback((product: CartItem) => {
    try {
      if (!product || !product.name || typeof product.price !== 'number') {
        console.error('Produto inválido:', product);
        return;
      }

      setCart(prevCart => {
        if (product.category === 'pizzas') {
          const uniqueId = product.id || `pizza_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
    }
  }, []);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    try {
      setCart(prevCart => {
        if (newQuantity <= 0) {
          return prevCart.filter(item => item.id !== productId);
        }
        return prevCart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        );
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
    }
  }, []);

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
    clearIncompleteOrder
  }), [
    cart, addToCart, updateQuantity, updateCartItem, removeFromCart, clearCart, 
    setServiceType, serviceType, totalItems, totalPrice, isCartLoaded, 
    incompleteOrder, updateIncompleteOrder, clearIncompleteOrder
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
