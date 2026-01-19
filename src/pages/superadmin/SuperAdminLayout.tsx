import { useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Store,
  Database,
  Settings,
  LogOut,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoHeader from "@/assets/anoto-logo-header.avif";

const navItems = [
  { title: "Dashboard", url: "/superadmin", icon: LayoutDashboard, end: true },
  { title: "Lojas", url: "/superadmin/stores", icon: Store },
  { title: "Usuários", url: "/superadmin/users", icon: Users },
  { title: "Uso de Dados", url: "/superadmin/usage", icon: Database },
  { title: "Atividade", url: "/superadmin/activity", icon: Activity },
  { title: "Configurações", url: "/superadmin/settings", icon: Settings },
];

export default function SuperAdminLayout() {
  const { isSuperAdmin, loading } = useSuperAdmin();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast.error("Acesso negado. Você não tem permissão de super admin.");
      navigate("/");
    }
  }, [isSuperAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Anoto Brand Yellow */}
      <aside className="w-64 bg-primary text-primary-foreground flex flex-col">
        {/* Header with Logo */}
        <div className="p-4 border-b border-black/10">
          <div className="flex items-center gap-3">
            <img 
              src={logoHeader} 
              alt="Anoto" 
              className="h-8 w-auto"
            />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Admin</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-black text-white"
                      : "text-black/70 hover:bg-black/10 hover:text-black"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-black/10">
          <Button
            variant="ghost"
            className="w-full justify-start text-black/70 hover:text-black hover:bg-black/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
