import { useAuth } from "@/hooks/useAuth";

const SUPER_ADMIN_EMAIL = "a@gmail.com";

export function useSuperAdmin() {
  const { user, loading } = useAuth();
  
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  
  return {
    isSuperAdmin,
    loading,
    superAdminEmail: SUPER_ADMIN_EMAIL,
  };
}
