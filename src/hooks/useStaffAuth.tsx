import { useCallback, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Session expiration time in milliseconds (8 hours)
const SESSION_EXPIRATION_MS = 8 * 60 * 60 * 1000;
// Session key for storage
const SESSION_STORAGE_KEY = 'staff_session_v2';

export interface StaffSession {
  staffId: string;
  storeId: string;
  name: string;
  role: 'admin' | 'garcom';
  // Timestamp when session was created (for expiration check)
  createdAt: number;
}

// Legacy session format for migration
interface LegacySession {
  staffId?: string;
  id?: string;
  storeId?: string;
  store_id?: string;
  name: string;
  cpf?: string;
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
// Session Security Utilities
// ============================================

/**
 * Checks if a session has expired
 */
const isSessionExpired = (session: StaffSession): boolean => {
  const now = Date.now();
  const sessionAge = now - session.createdAt;
  return sessionAge > SESSION_EXPIRATION_MS;
};

/**
 * Validates session data structure to prevent tampering
 */
const isValidSessionStructure = (data: unknown): data is StaffSession => {
  if (!data || typeof data !== 'object') return false;
  const session = data as Record<string, unknown>;
  
  return (
    typeof session.staffId === 'string' &&
    session.staffId.length > 0 &&
    typeof session.storeId === 'string' &&
    session.storeId.length > 0 &&
    typeof session.name === 'string' &&
    (session.role === 'admin' || session.role === 'garcom') &&
    typeof session.createdAt === 'number' &&
    session.createdAt > 0
  );
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

// Initialize session from sessionStorage (runs once on module load)
// Using sessionStorage instead of localStorage for better security
// - Session is cleared when browser tab is closed
// - Not accessible to other tabs
const initializeSession = () => {
  try {
    // First, try to migrate from old localStorage format
    const oldSession = localStorage.getItem('staff_session');
    if (oldSession) {
      // Remove old format immediately for security
      localStorage.removeItem('staff_session');
      
      try {
        const parsed = JSON.parse(oldSession) as LegacySession;
        // Migrate to new format in sessionStorage (without CPF)
        const migratedSession: StaffSession = {
          staffId: parsed.staffId || parsed.id || '',
          storeId: parsed.storeId || parsed.store_id || '',
          name: parsed.name,
          role: parsed.role,
          createdAt: Date.now() // Treat as new session
        };
        
        if (migratedSession.staffId && migratedSession.storeId) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(migratedSession));
          store = { session: migratedSession, loading: false };
          return;
        }
      } catch {
        // Ignore migration errors
      }
    }

    // Load from sessionStorage
    const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      
      // Validate session structure
      if (!isValidSessionStructure(parsed)) {
        console.warn('Invalid session structure detected, clearing session');
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        store = { session: null, loading: false };
        return;
      }
      
      // Check session expiration
      if (isSessionExpired(parsed)) {
        console.info('Session expired, clearing session');
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        store = { session: null, loading: false };
        return;
      }
      
      store = { session: parsed, loading: false };
    } else {
      store = { session: null, loading: false };
    }
  } catch (error) {
    console.error('Error loading staff session:', error);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('staff_session'); // Also clean up old format
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
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('staff_session'); // Also clear legacy format
  setStore({ session: null });
};

// Export function to set session (used by login)
// Note: CPF is intentionally NOT stored in the session
export const setStaffSession = (sessionInput: { 
  staffId: string; 
  storeId: string; 
  name: string; 
  role: 'admin' | 'garcom';
  cpf?: string; // Accept but don't store
}) => {
  // Create session without sensitive PII (CPF)
  const session: StaffSession = {
    staffId: sessionInput.staffId,
    storeId: sessionInput.storeId,
    name: sessionInput.name,
    role: sessionInput.role,
    createdAt: Date.now()
  };
  
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
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