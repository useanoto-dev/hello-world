import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Clock,
  Monitor,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog {
  id: string;
  staff_id: string | null;
  staff_name: string | null;
  staff_role: string | null;
  action: string;
  module: string;
  record_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  login: "Login realizado",
  login_failed: "Tentativa de login inválida",
  logout: "Logout realizado",
  user_created: "Usuário criado",
  user_updated: "Usuário atualizado",
  user_deactivated: "Usuário desativado",
  user_activated: "Usuário ativado",
  user_deleted: "Usuário excluído",
  access_code_generated: "Código de acesso gerado",
  permissions_updated: "Permissões atualizadas",
  order_created: "Pedido criado",
  order_updated: "Pedido atualizado",
  order_canceled: "Pedido cancelado",
  cashier_opened: "Caixa aberto",
  cashier_closed: "Caixa fechado",
  discount_applied: "Desconto aplicado",
};

const moduleLabels: Record<string, string> = {
  auth: "Autenticação",
  users: "Usuários",
  orders: "Pedidos",
  cashier: "Caixa",
  products: "Produtos",
  settings: "Configurações",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  garcom: "Garçom",
  caixa: "Caixa",
};

const getActionColor = (action: string) => {
  if (action.includes("failed") || action.includes("canceled") || action.includes("deleted")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
  if (action.includes("created") || action.includes("activated")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  }
  if (action.includes("updated") || action.includes("generated")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
};

export default function AuditLogsPage() {
  const { restaurantId } = useActiveRestaurant();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", restaurantId, roleFilter, actionFilter, moduleFilter, dateFrom, dateTo],
    queryFn: async () => {
      if (!restaurantId) return [];

      let query = (supabase.from("audit_logs") as any)
        .select("*")
        .eq("store_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (roleFilter !== "all") {
        query = query.eq("staff_role", roleFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (moduleFilter !== "all") {
        query = query.eq("module", moduleFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!restaurantId,
  });

  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.staff_name?.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.module.toLowerCase().includes(searchLower) ||
      log.record_id?.toLowerCase().includes(searchLower)
    );
  });

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setActionFilter("all");
    setModuleFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const uniqueActions = [...new Set(logs?.map((l) => l.action) || [])];
  const uniqueModules = [...new Set(logs?.map((l) => l.module) || [])];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Histórico completo de atividades do sistema
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={clearFilters}>
          Limpar filtros
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os papéis</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="garcom">Garçom</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
              </SelectContent>
            </Select>

            {/* Module Filter */}
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {uniqueModules.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {moduleLabels[mod] || mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Data/Hora
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Usuário
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Papel
                    </div>
                  </TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      IP
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="w-8 h-8" />
                        <p>Nenhum registro de auditoria encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs?.map((log) => (
                    <Collapsible key={log.id} asChild>
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.staff_name || "Sistema"}
                          </TableCell>
                          <TableCell>
                            {log.staff_role ? (
                              <Badge variant="outline" className="text-xs">
                                {roleLabels[log.staff_role] || log.staff_role}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", getActionColor(log.action))}>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {moduleLabels[log.module] || log.module}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.ip_address || "-"}
                          </TableCell>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleRowExpanded(log.id)}
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    expandedRows.has(log.id) && "rotate-180"
                                  )}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={7} className="py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-muted-foreground mb-1">ID do Registro</p>
                                  <p className="font-mono text-xs">{log.record_id || "-"}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground mb-1">User Agent</p>
                                  <p className="font-mono text-xs truncate max-w-md">
                                    {log.user_agent || "-"}
                                  </p>
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div className="md:col-span-2">
                                    <p className="font-medium text-muted-foreground mb-1">Detalhes</p>
                                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {filteredLogs && filteredLogs.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Exibindo {filteredLogs.length} registros
        </div>
      )}
    </div>
  );
}
