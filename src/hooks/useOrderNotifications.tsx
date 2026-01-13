import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const serviceLabels: Record<string, string> = {
  delivery: 'Delivery',
  pickup: 'Retirada',
  dine_in: 'Mesa',
};

const NOTIFICATION_SOUND_URL = '/sounds/notification.ogg';

export function useOrderNotifications() {
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/dashboard');

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  }, []);

  // Play notification sound using Web Audio API as fallback
  const playNotificationSound = useCallback(() => {
    // Try HTML Audio first
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Fallback to Web Audio API
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          // Pleasant notification chime
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.3);

          gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
        } catch (error) {
          console.log('Could not play notification sound:', error);
        }
      });
    }
  }, []);

  // Show browser push notification
  const showPushNotification = useCallback((orderNumber: number, customerName: string, serviceType: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(`🍕 Novo Pedido #${orderNumber}`, {
      body: `${customerName} • ${serviceLabels[serviceType] || serviceType}`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `order-${orderNumber}`,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/dashboard/orders';
      notification.close();
    };

    // Auto close after 30 seconds
    setTimeout(() => notification.close(), 30000);
  }, []);

  useEffect(() => {
    if (!isAdminRoute) return;

    // Request notification permission when on admin routes
    requestNotificationPermission();

    // Create audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.preload = 'auto';

    const channel = supabase
      .channel('new-orders-notification')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          console.log('New order received:', payload);
          const order = payload.new as any;
          
          // Play notification sound
          playNotificationSound();

          // Show browser push notification
          showPushNotification(order.order_number, order.customer_name, order.order_type);

          // Show toast notification
          toast.success(`🍕 Novo Pedido #${order.order_number}`, {
            description: `${order.customer_name} • ${serviceLabels[order.order_type] || order.order_type}`,
            duration: 15000,
            action: {
              label: "Ver Pedidos",
              onClick: () => {
                window.location.href = '/dashboard/orders';
              },
            },
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isAdminRoute, playNotificationSound, showPushNotification, requestNotificationPermission]);

  return { notificationPermission, requestNotificationPermission };
}
