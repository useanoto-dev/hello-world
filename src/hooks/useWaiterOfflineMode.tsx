import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfflineOrder {
  id: string;
  data: any;
  createdAt: number;
  synced: boolean;
}

const OFFLINE_ORDERS_KEY = 'anoto_offline_orders';

export function useWaiterOfflineMode(storeId: string | null, staffId: string | null) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<OfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending orders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
    if (stored) {
      try {
        const orders = JSON.parse(stored) as OfflineOrder[];
        setPendingOrders(orders.filter(o => !o.synced));
      } catch (e) {
        console.error('Error loading offline orders:', e);
      }
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada! Sincronizando pedidos...');
      syncPendingOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem conexão. Pedidos serão salvos localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save order locally when offline
  const saveOrderOffline = useCallback((orderData: any) => {
    const offlineOrder: OfflineOrder = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: {
        ...orderData,
        store_id: storeId,
        staff_id: staffId,
        order_source: 'pdv_offline',
      },
      createdAt: Date.now(),
      synced: false,
    };

    const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
    const orders: OfflineOrder[] = stored ? JSON.parse(stored) : [];
    orders.push(offlineOrder);
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
    
    setPendingOrders(prev => [...prev, offlineOrder]);
    toast.info('Pedido salvo localmente. Será enviado quando a conexão voltar.');
    
    return offlineOrder.id;
  }, [storeId, staffId]);

  // Sync pending orders to server
  const syncPendingOrders = useCallback(async () => {
    if (!isOnline || pendingOrders.length === 0 || isSyncing) return;

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      for (const order of pendingOrders) {
        if (order.synced) continue;

        try {
          const { error } = await supabase
            .from('orders')
            .insert(order.data);

          if (!error) {
            // Mark as synced
            const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
            if (stored) {
              const orders: OfflineOrder[] = JSON.parse(stored);
              const updated = orders.map(o => 
                o.id === order.id ? { ...o, synced: true } : o
              );
              localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(updated));
            }
            syncedCount++;
          } else {
            console.error('Error syncing order:', error);
          }
        } catch (e) {
          console.error('Error syncing order:', e);
        }
      }

      if (syncedCount > 0) {
        toast.success(`${syncedCount} pedido(s) sincronizado(s) com sucesso!`);
        setPendingOrders(prev => prev.filter(o => !o.synced));
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, pendingOrders, isSyncing]);

  // Create order - handles both online and offline
  const createOrder = useCallback(async (orderData: any) => {
    if (!isOnline) {
      return { 
        offlineId: saveOrderOffline(orderData), 
        isOffline: true,
        error: null 
      };
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          store_id: storeId,
          staff_id: staffId,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, isOffline: false, error: null };
    } catch (error) {
      // If online but request fails, save offline
      return { 
        offlineId: saveOrderOffline(orderData), 
        isOffline: true,
        error 
      };
    }
  }, [isOnline, storeId, staffId, saveOrderOffline]);

  // Retry sync periodically when online
  useEffect(() => {
    if (!isOnline || pendingOrders.length === 0) return;

    const interval = setInterval(syncPendingOrders, 30000); // Try every 30 seconds
    return () => clearInterval(interval);
  }, [isOnline, pendingOrders.length, syncPendingOrders]);

  return {
    isOnline,
    pendingOrders,
    pendingCount: pendingOrders.length,
    isSyncing,
    createOrder,
    syncPendingOrders,
    saveOrderOffline,
  };
}
