import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskedInput } from "@/components/ui/masked-input";
import logoFull from "@/assets/anoto-logo-full.png";
import { getDefaultRouteForRole, type StaffRole } from "@/hooks/useStaffAuth";

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");

  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get value directly from input in case of autofill not triggering state update
    const cpfInput = document.getElementById('cpf') as HTMLInputElement;
    const actualCpf = cpfInput?.value || cpf;
    const actualCleanCpf = actualCpf.replace(/\D/g, "");
    
    if (!actualCleanCpf || actualCleanCpf.length !== 11) {
      toast.error("CPF inválido");
      return;
    }

    if (!password) {
      toast.error("Digite sua senha");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting login with CPF:", actualCleanCpf);
      
      const { data: staff, error } = await (supabase.from("store_staff") as any)
        .select("id, name, role, is_active, password_hash, locked_until, failed_login_attempts, store_id, cpf")
        .eq("cpf", actualCleanCpf)
        .eq("is_deleted", false)
        .maybeSingle();

      console.log("Query result:", { staff, error });

      if (error) {
        console.error("Database error:", error);
        toast.error("Erro ao buscar funcionário");
        setIsLoading(false);
        return;
      }

      if (!staff) {
        await logAudit(null, null, "login_failed", "auth", null, { cpf: actualCleanCpf, reason: "user_not_found" });
        toast.error("CPF não encontrado");
        setIsLoading(false);
        return;
      }

      if (!staff.is_active) {
        await logAudit(staff.store_id, staff.id, "login_failed", "auth", staff.id, { reason: "inactive_user" });
        toast.error("Usuário desativado. Contate o administrador.");
        setIsLoading(false);
        return;
      }

      if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
        toast.error("Conta bloqueada. Tente novamente mais tarde.");
        setIsLoading(false);
        return;
      }

      // Verify password
      if (staff.password_hash !== password) {
        const newAttempts = (staff.failed_login_attempts || 0) + 1;
        const updates: Record<string, unknown> = { failed_login_attempts: newAttempts };
        
        if (newAttempts >= 5) {
          updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }
        
        await (supabase.from("store_staff") as any).update(updates).eq("id", staff.id);
        await logAudit(staff.store_id, staff.id, "login_failed", "auth", staff.id, { attempts: newAttempts });
        
        toast.error(newAttempts >= 5 ? "Conta bloqueada por 30 minutos" : "Senha incorreta");
        setIsLoading(false);
        return;
      }

      // Success - reset attempts and update last login
      await (supabase.from("store_staff") as any)
        .update({ 
          failed_login_attempts: 0, 
          locked_until: null,
          last_login_at: new Date().toISOString()
        })
        .eq("id", staff.id);

      await logAudit(staff.store_id, staff.id, "login", "auth", staff.id, { role: staff.role });

      // Store staff session in localStorage
      localStorage.setItem("staff_session", JSON.stringify({
        staffId: staff.id,
        storeId: staff.store_id,
        name: staff.name,
        cpf: actualCleanCpf,
        role: staff.role
      }));

      toast.success(`Bem-vindo, ${staff.name}!`);
      const defaultRoute = getDefaultRouteForRole(staff.role as StaffRole);
      navigate(defaultRoute);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const logAudit = async (
    storeId: string | null,
    staffId: string | null,
    action: string,
    module: string,
    recordId: string | null,
    details: Record<string, unknown>
  ) => {
    try {
      await (supabase.from("audit_logs") as any).insert({
        store_id: storeId,
        staff_id: staffId,
        action,
        module,
        record_id: recordId,
        details,
        ip_address: null,
        user_agent: navigator.userAgent
      });
    } catch (e) {
      console.error("Failed to log audit:", e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={logoFull} alt="Anoto" className="h-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Funcionários</CardTitle>
          <CardDescription>
            Entre com seu CPF e senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <MaskedInput
                id="cpf"
                maskType="cpf"
                value={cpf}
                onValueChange={(raw) => setCpf(raw)}
                placeholder="000.000.000-00"
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground"
            >
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
