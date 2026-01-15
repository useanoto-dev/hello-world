import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface StaffSession {
  staffId: string;
  storeId: string;
  name: string;
  cpf: string;
  role: 'admin' | 'garcom';
}

export type StaffRole = 'admin' | 'garcom';

interface UseStaffAuthReturn {
  staffSession: StaffSession | null;
  isStaffLoggedIn: boolean;
  staffId: string | null;
  storeId: string | null;
  name: string | null;
  role: StaffRole | null;
  isAdmin: boolean;
  isGarcom: boolean;
  logout: () => void;
  loading: boolean;
}

// Default route for each role
export const getDefaultRouteForRole = (role: StaffRole | null): string => {
  switch (role) {
    case 'garcom':
      return '/dashboard/waiter-pos';
    case 'admin':
    default:
      return '/dashboard';
  }
};

// Routes allowed per role - admin has access to all, garcom has specific routes
export const routePermissions: Record<string, StaffRole[]> = {
  '/dashboard': ['admin'],
  '/dashboard/pdv': ['admin'],
  '/dashboard/waiter-pos': ['admin', 'garcom'],
  '/dashboard/waiter-orders': ['admin', 'garcom'],
  '/dashboard/comandas': ['admin'],
  '/dashboard/orders': ['admin'],
  '/dashboard/tables': ['admin', 'garcom'],
  '/dashboard/analytics': ['admin'],
  '/dashboard/financeiro': ['admin'],
  '/dashboard/customers': ['admin'],
  '/dashboard/products': ['admin'],
  '/dashboard/menu-manager': ['admin'],
  '/dashboard/menu-images': ['admin'],
  '/dashboard/menu-bulk-edit': ['admin'],
  '/dashboard/pizza-flavors': ['admin'],
  '/dashboard/flows': ['admin'],
  '/dashboard/inventory': ['admin'],
  '/dashboard/coupons': ['admin'],
  '/dashboard/banners': ['admin'],
  '/dashboard/integrations': ['admin'],
  '/dashboard/whatsapp-messages': ['admin'],
  '/dashboard/staff': ['admin'],
  '/dashboard/audit': ['admin'],
  '/dashboard/settings': ['admin'],
  '/dashboard/subscription': ['admin'],
  '/dashboard/profile': ['admin', 'garcom'],
};

// Check if a role has access to a route
export const canAccessRoute = (route: string, role: StaffRole | null): boolean => {
  if (!role) return true; // Admin via Supabase Auth has full access
  
  // Check exact match first
  if (routePermissions[route]) {
    return routePermissions[route].includes(role);
  }
  
  // Check if route starts with any permitted pattern
  for (const pattern of Object.keys(routePermissions)) {
    if (route.startsWith(pattern + '/')) {
      return routePermissions[pattern].includes(role);
    }
  }
  
  // Route not in permissions = allowed by default
  return true;
};

// ============================================
// Shared state store for staff session
// Ensures all components see the same state instantly
// ============================================
interface StaffStore {
  session: StaffSession | null;
  loading: boolean;
}

let store: StaffStore = { session: null, loading: true };
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const setStore = (newStore: Partial<StaffStore>) => {
  store = { ...store, ...newStore };
  notifyListeners();
};

// Initialize session from localStorage (runs once on module load)
const initializeSession = () => {
  try {
    const savedSession = localStorage.getItem('staff_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      store = {
        session: {
          staffId: parsed.staffId || parsed.id,
          storeId: parsed.storeId || parsed.store_id,
          name: parsed.name,
          cpf: parsed.cpf || '',
          role: parsed.role
        },
        loading: false
      };
    } else {
      store = { session: null, loading: false };
    }
  } catch (error) {
    console.error('Error loading staff session:', error);
    localStorage.removeItem('staff_session');
    store = { session: null, loading: false };
  }
};

// Initialize immediately when module loads
initializeSession();

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const getSnapshot = (): StaffStore => store;
const getServerSnapshot = (): StaffStore => ({ session: null, loading: false });

// Export function to clear session (used by logout)
export const clearStaffSession = () => {
  localStorage.removeItem('staff_session');
  setStore({ session: null });
};

// Export function to set session (used by login)
export const setStaffSession = (session: StaffSession) => {
  localStorage.setItem('staff_session', JSON.stringify(session));
  setStore({ session });
};

// ============================================
// Main Hook
// ============================================
export function useStaffAuth(): UseStaffAuthReturn {
  const navigate = useNavigate();
  
  // Use sync external store for shared state across all components
  const { session: staffSession, loading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const isStaffLoggedIn = !!staffSession;
  const staffId = staffSession?.staffId ?? null;
  const storeId = staffSession?.storeId ?? null;
  const name = staffSession?.name ?? null;
  const role = staffSession?.role ?? null;

  const isAdmin = role === 'admin';
  const isGarcom = role === 'garcom';

  // Logout function
  const logout = useCallback(() => {
    clearStaffSession();
    toast.success('Sessão encerrada');
    navigate('/funcionario');
  }, [navigate]);

  return {
    staffSession,
    isStaffLoggedIn,
    staffId,
    storeId,
    name,
    role,
    isAdmin,
    isGarcom,
    logout,
    loading,
  };
}