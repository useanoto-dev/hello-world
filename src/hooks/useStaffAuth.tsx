import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface StaffSession {
  staffId: string;
  storeId: string;
  name: string;
  cpf: string;
  role: 'admin' | 'caixa' | 'garcom';
}

export interface StaffPermissions {
  can_open_cashier: boolean;
  can_close_cashier: boolean;
  can_cancel_orders: boolean;
  can_apply_discounts: boolean;
  can_view_reports: boolean;
  can_finalize_sales: boolean;
}

export type StaffRole = 'admin' | 'caixa' | 'garcom';

interface UseStaffAuthReturn {
  staffSession: StaffSession | null;
  isStaffLoggedIn: boolean;
  staffId: string | null;
  storeId: string | null;
  name: string | null;
  role: StaffRole | null;
  isAdmin: boolean;
  isCaixa: boolean;
  isGarcom: boolean;
  permissions: StaffPermissions | null;
  hasPermission: (permission: keyof StaffPermissions) => boolean;
  logout: () => void;
  loading: boolean;
}

// Default route for each role
export const getDefaultRouteForRole = (role: StaffRole | null): string => {
  switch (role) {
    case 'garcom':
      return '/dashboard/tables';
    case 'caixa':
      return '/dashboard/pdv';
    case 'admin':
    default:
      return '/dashboard';
  }
};

// Routes allowed per role
export const routePermissions: Record<string, StaffRole[]> = {
  '/dashboard': ['admin'],
  '/dashboard/pdv': ['admin', 'caixa'],
  '/dashboard/tables': ['admin', 'caixa', 'garcom'],
  '/dashboard/comandas': ['admin', 'caixa'],
  '/dashboard/orders': ['admin', 'caixa'],
  '/dashboard/my-orders': ['garcom'],
  '/dashboard/analytics': ['admin', 'caixa'],
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
  '/dashboard/profile': ['caixa', 'garcom'],
};

// Check if a role has access to a route
export const canAccessRoute = (route: string, role: StaffRole | null): boolean => {
  if (!role) return true; // Admin via Supabase Auth has full access
  
  // Find matching route pattern
  const matchingRoute = Object.keys(routePermissions).find(pattern => {
    if (route === pattern) return true;
    if (route.startsWith(pattern + '/')) return true;
    return false;
  });
  
  if (!matchingRoute) return true; // Route not in permissions = allowed
  
  return routePermissions[matchingRoute].includes(role);
};

export function useStaffAuth(): UseStaffAuthReturn {
  const navigate = useNavigate();
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load staff session from localStorage
  useEffect(() => {
    const loadSession = () => {
      try {
        const savedSession = localStorage.getItem('staff_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession) as StaffSession;
          setStaffSession(parsed);
        }
      } catch (error) {
        console.error('Error loading staff session:', error);
        localStorage.removeItem('staff_session');
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();
  }, []);

  // Fetch permissions for caixa role
  const { data: permissions } = useQuery({
    queryKey: ['staff-permissions', staffSession?.staffId],
    queryFn: async () => {
      if (!staffSession?.staffId || staffSession.role !== 'caixa') return null;
      
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('*')
        .eq('staff_id', staffSession.staffId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching staff permissions:', error);
        return null;
      }
      
      return data as StaffPermissions | null;
    },
    enabled: !!staffSession?.staffId && staffSession.role === 'caixa',
  });

  const isStaffLoggedIn = !!staffSession;
  const staffId = staffSession?.staffId ?? null;
  const storeId = staffSession?.storeId ?? null;
  const name = staffSession?.name ?? null;
  const role = staffSession?.role ?? null;

  const isAdmin = role === 'admin';
  const isCaixa = role === 'caixa';
  const isGarcom = role === 'garcom';

  // Check if staff has a specific permission
  const hasPermission = useCallback((permission: keyof StaffPermissions): boolean => {
    // Admin has all permissions
    if (isAdmin || !isStaffLoggedIn) return true;
    
    // Garçom has limited permissions
    if (isGarcom) return false;
    
    // Caixa checks specific permissions
    if (isCaixa && permissions) {
      return permissions[permission] ?? false;
    }
    
    return false;
  }, [isAdmin, isCaixa, isGarcom, isStaffLoggedIn, permissions]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('staff_session');
    setStaffSession(null);
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
    isCaixa,
    isGarcom,
    permissions: permissions ?? null,
    hasPermission,
    logout,
    loading,
  };
}
