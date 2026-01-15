import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskedInput } from "@/components/ui/masked-input";
import { cn } from "@/lib/utils";
import logoFull from "@/assets/anoto-logo-full.png";

type LoginStep = "credentials" | "set_password";

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [cpf, setCpf] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Staff data for password setup
  const [staffData, setStaffData] = useState<{ id: string; name: string } | null>(null);

  const cleanCpf = cpf.replace(/\D/g, "");

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanCpf || cleanCpf.length !== 11) {
      toast.error("CPF inválido");
      return;
    }

    setIsLoading(true);

    try {
      // First, try to login with password
      if (password) {
        const { data: staff, error } = await (supabase.from("store_staff") as any)
          .select("id, name, role, is_active, password_hash, locked_until, failed_login_attempts, store_id")
          .eq("cpf", cleanCpf)
          .eq("is_deleted", false)
          .single();

        if (error || !staff) {
          await logAudit(null, null, "login_failed", "auth", null, { cpf: cleanCpf, reason: "user_not_found" });
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

        // Verify password (in a real app, use bcrypt in an edge function)
        if (staff.password_hash !== password) { // Simplified - should use proper hashing
          const newAttempts = (staff.failed_login_attempts || 0) + 1;
          const updates: Record<string, unknown> = { failed_login_attempts: newAttempts };
          
          if (newAttempts >= 5) {
            updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min lock
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
          id: staff.id,
          name: staff.name,
          role: staff.role,
          store_id: staff.store_id
        }));

        toast.success(`Bem-vindo, ${staff.name}!`);
        navigate("/dashboard/pdv");
        return;
      }

      // Try access code login
      if (accessCode) {
        const { data: codeData, error: codeError } = await (supabase.from("access_codes") as any)
          .select("*, staff:store_staff(*)")
          .eq("code", accessCode)
          .eq("is_used", false)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (codeError || !codeData) {
          toast.error("Código inválido ou expirado");
          setIsLoading(false);
          return;
        }

        // Verify CPF matches
        if (codeData.staff.cpf !== cleanCpf) {
          toast.error("CPF não corresponde ao código");
          setIsLoading(false);
          return;
        }

        // Code is valid - proceed to set password
        setStaffData({ id: codeData.staff.id, name: codeData.staff.name });
        setStep("set_password");
        toast.success("Código validado! Crie sua senha.");
      } else {
        toast.error("Informe a senha ou o código de acesso");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    if (!staffData) return;

    setIsLoading(true);

    try {
      // Update password and mark code as used
      await (supabase.from("store_staff") as any)
        .update({ 
          password_hash: newPassword, // In production, hash this
          last_login_at: new Date().toISOString()
        })
        .eq("id", staffData.id);

      // Mark access code as used
      await (supabase.from("access_codes") as any)
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq("code", accessCode);

      // Get staff data for session
      const { data: staff } = await (supabase.from("store_staff") as any)
        .select("id, name, role, store_id")
        .eq("id", staffData.id)
        .single();

      if (staff) {
        await logAudit(staff.store_id, staff.id, "login", "auth", staff.id, { first_login: true });
        
        localStorage.setItem("staff_session", JSON.stringify({
          id: staff.id,
          name: staff.name,
          role: staff.role,
          store_id: staff.store_id
        }));

        toast.success("Senha criada com sucesso!");
        navigate("/dashboard/pdv");
      }
    } catch (error) {
      console.error("Set password error:", error);
      toast.error("Erro ao criar senha");
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
        ip_address: null, // Would need server-side to get real IP
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
          <CardTitle className="text-2xl font-bold">
            {step === "credentials" ? "Acesso Funcionários" : "Criar Senha"}
          </CardTitle>
          <CardDescription>
            {step === "credentials" 
              ? "Entre com seu CPF e senha ou código de acesso"
              : `Olá ${staffData?.name}! Crie sua senha de acesso.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou primeiro acesso
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessCode">Código de Acesso</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    className="pl-10 uppercase font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use o código recebido do administrador para criar sua senha
                </p>
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
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">As senhas não conferem</p>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                disabled={isLoading || newPassword !== confirmPassword}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Criar Senha e Entrar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground"
            >
              Voltar para login do administrador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
