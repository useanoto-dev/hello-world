import { useState } from "react";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, Lock, Eye, EyeOff, Shield, Loader2, 
  CheckCircle, AlertCircle, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "Administrador", color: "bg-purple-500" },
  garcom: { label: "Garçom", color: "bg-green-500" },
};

export default function StaffProfilePage() {
  const { staffSession, name, role, logout } = useStaffAuth();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Format CPF
  const formatCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Validations
    if (!currentPassword) {
      toast.error("Digite a senha atual");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    if (!staffSession?.staffId) {
      toast.error("Sessão inválida");
      return;
    }

    setChangingPassword(true);
    
    try {
      // Verify current password
      const { data: staff, error: verifyError } = await supabase
        .from('store_staff')
        .select('id, password_hash, store_id')
        .eq('id', staffSession.staffId)
        .single();

      if (verifyError || !staff) {
        toast.error("Erro ao verificar funcionário");
        return;
      }

      // Simple password verification (in production, use proper hashing)
      if (staff.password_hash !== currentPassword) {
        toast.error("Senha atual incorreta");
        return;
      }

      // Update password
      const { error: updateError } = await supabase
        .from('store_staff')
        .update({ 
          password_hash: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffSession.staffId);

      if (updateError) throw updateError;

      // Log to audit
      await supabase.from('audit_logs').insert({
        store_id: staff.store_id,
        staff_id: staffSession.staffId,
        staff_name: name,
        staff_role: role,
        module: 'staff',
        action: 'password_changed',
        record_id: staffSession.staffId,
        details: { changed_by: 'self' }
      });

      toast.success("Senha alterada com sucesso!");
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const roleConfig = role ? roleLabels[role] : roleLabels.garcom;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Meu Perfil
        </h1>
        <p className="text-muted-foreground text-sm">
          Visualize seus dados e altere sua senha
        </p>
      </div>

      {/* Profile Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Seus dados de cadastro no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-2xl font-bold text-white uppercase">
                  {name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{name || 'Funcionário'}</h3>
                <Badge className={cn("text-white mt-1", roleConfig.color)}>
                  {roleConfig.label}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 pt-4 border-t">
              <div>
                <Label className="text-muted-foreground text-xs">CPF</Label>
                <p className="font-medium">
                  {staffSession?.cpf ? formatCPF(staffSession.cpf) : '---'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Digite sua senha atual e escolha uma nova senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-destructive">
                  A senha deve ter pelo menos 6 caracteres
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  As senhas não conferem
                </p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Button 
          variant="outline" 
          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Encerrar Sessão
        </Button>
      </motion.div>
    </div>
  );
}
