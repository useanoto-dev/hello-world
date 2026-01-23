import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Shield,
  CheckCircle,
  Clock,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { MaskedInput } from "@/components/ui/masked-input";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { validateStrongPassword } from "@/lib/validators";

interface StaffMember {
  id: string;
  name: string;
  cpf: string;
  role: "admin" | "garcom";
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  last_login_at: string | null;
  created_by: string | null;
  permissions?: StaffPermissions;
}

interface StaffPermissions {
  id: string;
  can_open_cashier: boolean;
  can_close_cashier: boolean;
  can_cancel_orders: boolean;
  can_apply_discounts: boolean;
  can_view_reports: boolean;
  can_finalize_sales: boolean;
}


const roleLabels: Record<string, string> = {
  admin: "Administrador",
  garcom: "Garçom",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  garcom: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function StaffManagementPage() {
  const { restaurantId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    role: "garcom" as "admin" | "garcom",
    password: "",
  });

  const [permissions, setPermissions] = useState<Omit<StaffPermissions, "id">>({
    can_open_cashier: false,
    can_close_cashier: false,
    can_cancel_orders: false,
    can_apply_discounts: false,
    can_view_reports: false,
    can_finalize_sales: true,
  });

  // Fetch staff members
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ["store-staff", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("store_staff")
        .select(`
          id, name, cpf, role, is_active, is_deleted, created_at, last_login_at, created_by,
          permissions:staff_permissions(*)
        `)
        .eq("store_id", restaurantId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(staff => ({
        ...staff,
        permissions: staff.permissions?.[0] || null
      })) as StaffMember[];
    },
    enabled: !!restaurantId,
  });

  // Create staff mutation - uses edge function for secure password hashing
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!restaurantId) throw new Error("Restaurante não encontrado");
      
      // Use edge function for secure password hashing
      const { data: result, error } = await supabase.functions.invoke('staff-auth', {
        body: { 
          store_id: restaurantId,
          name: data.name,
          cpf: data.cpf.replace(/\D/g, ""),
          role: data.role,
          password: data.password
        },
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return { staff: result.staff };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      setShowCreateModal(false);
      setFormData({ name: "", cpf: "", role: "garcom", password: "" });
      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate") || error.message?.includes("CPF já cadastrado")) {
        toast.error("CPF já cadastrado para esta loja");
      } else {
        toast.error(error.message || "Erro ao criar usuário");
      }
    },
  });

  // Update staff mutation - uses edge function for password updates
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffMember> & { password?: string } }) => {
      if (!restaurantId) throw new Error("Restaurante não encontrado");
      
      // If password is being updated, use edge function
      if (data.password && data.password.length >= 6) {
        const { data: result, error: pwError } = await supabase.functions.invoke('staff-auth', {
          body: { staff_id: id, password: data.password },
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (pwError) throw pwError;
        if (result?.error) throw new Error(result.error);
      }
      
      // Update other fields (name, role) directly
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.role) updateData.role = data.role;
      
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("store_staff")
          .update(updateData)
          .eq("id", id);
        
        if (error) throw error;
      }
      
      await (supabase.from("audit_logs") as any).insert({
        store_id: restaurantId,
        action: "UPDATE_USER",
        module: "staff",
        record_id: id,
        details: { name: data.name, role: data.role, password_changed: !!data.password },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      setShowEditModal(false);
      setSelectedStaff(null);
      toast.success("Usuário atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ staffId, permissions }: { staffId: string; permissions: Omit<StaffPermissions, "id"> }) => {
      if (!restaurantId) throw new Error("Restaurante não encontrado");
      
      const { error } = await supabase
        .from("staff_permissions")
        .update(permissions)
        .eq("staff_id", staffId);
      
      if (error) throw error;
      
      await (supabase.from("audit_logs") as any).insert({
        store_id: restaurantId,
        action: "UPDATE_PERMISSIONS",
        module: "staff",
        record_id: staffId,
        details: permissions as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      setShowPermissionsModal(false);
      setSelectedStaff(null);
      toast.success("Permissões atualizadas!");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissões");
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!restaurantId) throw new Error("Restaurante não encontrado");
      
      const { error } = await supabase
        .from("store_staff")
        .update({ is_active: isActive })
        .eq("id", id);
      
      if (error) throw error;
      
      await supabase.from("audit_logs").insert({
        store_id: restaurantId,
        action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        module: "staff",
        record_id: id,
      });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast.success(isActive ? "Usuário ativado!" : "Usuário desativado!");
    },
    onError: () => {
      toast.error("Erro ao alterar status");
    },
  });

  // Delete (soft) mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!restaurantId) throw new Error("Restaurante não encontrado");
      
      const { error } = await supabase
        .from("store_staff")
        .update({ is_deleted: true, is_active: false })
        .eq("id", id);
      
      if (error) throw error;
      
      await supabase.from("audit_logs").insert({
        store_id: restaurantId,
        action: "DELETE_USER",
        module: "staff",
        record_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast.success("Usuário removido!");
    },
    onError: () => {
      toast.error("Erro ao remover usuário");
    },
  });

  // Filter staff members
  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.cpf.includes(searchTerm.replace(/\D/g, ""));
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleEditClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      cpf: staff.cpf,
      role: staff.role,
      password: "",
    });
    setShowEditModal(true);
  };

  const handlePermissionsClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    if (staff.permissions) {
      setPermissions({
        can_open_cashier: staff.permissions.can_open_cashier,
        can_close_cashier: staff.permissions.can_close_cashier,
        can_cancel_orders: staff.permissions.can_cancel_orders,
        can_apply_discounts: staff.permissions.can_apply_discounts,
        can_view_reports: staff.permissions.can_view_reports,
        can_finalize_sales: staff.permissions.can_finalize_sales,
      });
    }
    setShowPermissionsModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, "");
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Garçons
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os garçons do App do Garçom
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Garçom
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="garcom">Garçom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF (Login)</TableHead>
                <TableHead>Senha</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCPF(staff.cpf)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">
                        ••••••
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleBadgeColors[staff.role]}>
                        {roleLabels[staff.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {staff.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <UserX className="w-3 h-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {staff.last_login_at ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(staff.last_login_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">Nunca acessou</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(staff)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {staff.is_active ? (
                            <DropdownMenuItem 
                              onClick={() => toggleActiveMutation.mutate({ id: staff.id, isActive: false })}
                              className="text-orange-600"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Desativar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => toggleActiveMutation.mutate({ id: staff.id, isActive: true })}
                              className="text-green-600"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Ativar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(staff.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Garçom</DialogTitle>
            <DialogDescription>
              Adicione um novo garçom ao App do Garçom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do garçom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <MaskedInput
                id="cpf"
                maskType="cpf"
                value={formData.cpf}
                onValueChange={(rawValue) => setFormData({ ...formData, cpf: rawValue })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: "admin" | "garcom") => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="garcom">Garçom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha de acesso</Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Senha forte"
              />
              {formData.password && (
                <PasswordStrengthIndicator password={formData.password} />
              )}
              <p className="text-xs text-muted-foreground">
                O garçom usará esta senha para fazer login no App do Garçom
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createStaffMutation.mutate(formData)}
              disabled={!formData.name || !formData.cpf || !validateStrongPassword(formData.password).isValid || createStaffMutation.isPending}
            >
              {createStaffMutation.isPending ? "Criando..." : "Criar garçom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do funcionário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF (login)</Label>
              <Input
                id="edit-cpf"
                value={formatCPF(formData.cpf)}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Cargo</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: "admin" | "garcom") => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="garcom">Garçom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova senha (deixe vazio para manter)</Label>
              <Input
                id="edit-password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Digite para redefinir a senha"
              />
              {formData.password && (
                <PasswordStrengthIndicator password={formData.password} />
              )}
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a senha atual.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!selectedStaff) return;
                const updateData: Record<string, unknown> = { 
                  name: formData.name, 
                  role: formData.role 
                };
                if (formData.password && validateStrongPassword(formData.password).isValid) {
                  updateData.password = formData.password;
                }
                updateStaffMutation.mutate({
                  id: selectedStaff.id,
                  data: updateData as Partial<StaffMember> & { password?: string }
                });
              }}
              disabled={updateStaffMutation.isPending || (formData.password.length > 0 && !validateStrongPassword(formData.password).isValid)}
            >
              {updateStaffMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões do Caixa</DialogTitle>
            <DialogDescription>
              Configure as permissões de {selectedStaff?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Abrir caixa</Label>
                <p className="text-sm text-muted-foreground">Pode iniciar o expediente</p>
              </div>
              <Switch
                checked={permissions.can_open_cashier}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, can_open_cashier: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Fechar caixa</Label>
                <p className="text-sm text-muted-foreground">Pode encerrar o expediente</p>
              </div>
              <Switch
                checked={permissions.can_close_cashier}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, can_close_cashier: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Cancelar pedidos</Label>
                <p className="text-sm text-muted-foreground">Pode cancelar pedidos</p>
              </div>
              <Switch
                checked={permissions.can_cancel_orders}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, can_cancel_orders: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Aplicar descontos</Label>
                <p className="text-sm text-muted-foreground">Pode aplicar descontos em vendas</p>
              </div>
              <Switch
                checked={permissions.can_apply_discounts}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, can_apply_discounts: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Visualizar relatórios</Label>
                <p className="text-sm text-muted-foreground">Acesso aos relatórios do sistema</p>
              </div>
              <Switch
                checked={permissions.can_view_reports}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, can_view_reports: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Finalizar vendas</Label>
                <p className="text-sm text-muted-foreground">Pode receber pagamentos</p>
              </div>
              <Switch
                checked={permissions.can_finalize_sales}
                onCheckedChange={(checked) => 
                  setPermissions({ ...permissions, can_finalize_sales: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedStaff && updatePermissionsMutation.mutate({
                staffId: selectedStaff.id,
                permissions
              })}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? "Salvando..." : "Salvar permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
