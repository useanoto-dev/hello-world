import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePushNotificationsOptions {
  storeId: string | null;
  enabled?: boolean;
  onNewOrder?: (order: any) => void;
}

export function usePushNotifications({ storeId, enabled = true, onNewOrder }: UsePushNotificationsOptions) {
  const permissionRef = useRef<NotificationPermission>('default');
  const subscriptionRef = useRef<PushSubscription | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show local notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permissionRef.current !== 'granted') return;

    try {
      // Try service worker notification first (works in background)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: 'new-order',
            ...options,
          });
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, []);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!storeId || !enabled) return;

    // Request permission on mount
    requestPermission();

    const channel = supabase
      .channel(`push-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const order = payload.new as any;
          
          // Show push notification
          showNotification(`Novo Pedido #${order.order_number}`, {
            body: `${order.customer_name} - R$ ${order.total?.toFixed(2)}`,
            data: { orderId: order.id, orderNumber: order.order_number },
          });

          // Play sound if available
          try {
            const audio = new Audio('/sounds/notification.ogg');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}

          // Call callback
          onNewOrder?.(order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, enabled, requestPermission, showNotification, onNewOrder]);

  return {
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
    permission: permissionRef.current,
  };
}
