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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
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
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Super Admin</h1>
              <p className="text-xs text-gray-400">Painel de Controle</p>
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
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
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
        <div className="p-3 border-t border-gray-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
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
