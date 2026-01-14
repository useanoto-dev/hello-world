// Settings Profile Tab - Extracted from SettingsPage  
import { memo, useState } from 'react';
import { User, Lock, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaskedInput } from '@/components/ui/masked-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  cep: string;
  city: string;
  state: string;
}

interface SettingsProfileTabProps {
  profile: ProfileData;
  onProfileChange: (data: Partial<ProfileData>) => void;
  onSaveProfile: () => Promise<void>;
  savingProfile: boolean;
}

const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const SettingsProfileTab = memo(function SettingsProfileTab({
  profile,
  onProfileChange,
  onSaveProfile,
  savingProfile,
}: SettingsProfileTabProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const fetchAddressFromCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      onProfileChange({
        city: data.localidade || "",
        state: data.uf || "",
      });
      toast.success("Cidade e estado atualizados!");
    } catch (error) {
      console.error("Error fetching CEP:", error);
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    onProfileChange({ cep: formatted });
    
    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      fetchAddressFromCep(cleanCep);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Account Info */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Informações da Conta
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Atualize suas informações pessoais
          </p>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="space-y-1">
            <Label className="text-[9px]">Email (não editável)</Label>
            <Input
              value={profile?.email || ""}
              disabled
              className="h-6 text-[9px] bg-muted"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[9px]">Nome Completo</Label>
            <Input
              value={profile.full_name}
              onChange={(e) => onProfileChange({ full_name: e.target.value })}
              className="h-6 text-[9px]"
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[9px]">Telefone/Celular</Label>
            <MaskedInput
              maskType="phone"
              value={profile.phone}
              onValueChange={(rawValue) => onProfileChange({ phone: rawValue })}
              className="h-6 text-[9px]"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">CEP</Label>
              <div className="relative">
                <Input
                  value={profile.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className="h-6 text-[9px]"
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[9px]">Cidade</Label>
              <Input
                value={profile.city}
                onChange={(e) => onProfileChange({ city: e.target.value })}
                className="h-6 text-[9px]"
                placeholder="Sua cidade"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[9px]">Estado</Label>
              <Select
                value={profile.state}
                onValueChange={(value) => onProfileChange({ state: value })}
              >
                <SelectTrigger className="h-6 text-[9px]">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((uf) => (
                    <SelectItem key={uf} value={uf} className="text-[9px]">{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full h-7 text-[10px]"
            disabled={savingProfile}
            onClick={onSaveProfile}
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                Salvar Informações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Alterar Senha
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Atualize sua senha de acesso
          </p>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="space-y-1">
            <Label className="text-[9px]">Nova Senha</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-7 text-[10px] pr-8"
                placeholder="Mínimo 6 caracteres"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-7 w-7"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px]">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-7 text-[10px] pr-8"
                placeholder="Repita a nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-7 w-7"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full h-7 text-[10px]"
            disabled={changingPassword || !newPassword || !confirmPassword}
            onClick={handleChangePassword}
          >
            {changingPassword ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Alterando...
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-1" />
                Alterar Senha
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});
