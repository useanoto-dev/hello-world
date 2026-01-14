import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Loader2, TrendingUp, TrendingDown, DollarSign, Plus, 
  ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon,
  Trash2, Edit2, Filter, Download, Receipt, Wallet,
  PiggyBank, CreditCard, Banknote, Building2, ShoppingCart,
  Utensils, Car, Zap, Droplets, Phone, Package
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";

type TransactionType = "income" | "expense";
type PeriodFilter = "today" | "week" | "month" | "custom";

interface Transaction {
  id: string;
  store_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  reference_date: string;
  notes: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: "fornecedores", label: "Fornecedores", icon: Package },
  { value: "aluguel", label: "Aluguel", icon: Building2 },
  { value: "funcionarios", label: "Funcionários", icon: Utensils },
  { value: "energia", label: "Energia Elétrica", icon: Zap },
  { value: "agua", label: "Água", icon: Droplets },
  { value: "telefone", label: "Telefone/Internet", icon: Phone },
  { value: "transporte", label: "Transporte", icon: Car },
  { value: "manutencao", label: "Manutenção", icon: Building2 },
  { value: "marketing", label: "Marketing", icon: TrendingUp },
  { value: "impostos", label: "Impostos", icon: Receipt },
  { value: "outros", label: "Outros", icon: DollarSign },
];

const INCOME_CATEGORIES = [
  { value: "vendas_avulsas", label: "Vendas Avulsas", icon: ShoppingCart },
  { value: "servicos", label: "Serviços", icon: Utensils },
  { value: "reembolso", label: "Reembolso", icon: ArrowDownRight },
  { value: "investimento", label: "Investimento", icon: PiggyBank },
  { value: "outros", label: "Outros", icon: DollarSign },
];

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Wallet },
  { value: "cartao_credito", label: "Cartão de Crédito", icon: CreditCard },
  { value: "cartao_debito", label: "Cartão de Débito", icon: CreditCard },
  { value: "transferencia", label: "Transferência", icon: Building2 },
];

const CHART_COLORS = {
  income: "hsl(142, 76%, 36%)",
  expense: "hsl(0, 84%, 60%)",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
];

export default function FinancialPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  
  // Form state
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    payment_method: "",
    reference_date: new Date(),
    notes: "",
  });

  // Date range calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: subDays(now, 7), end: endOfDay(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        return {
          start: customDateRange.from || startOfMonth(now),
          end: customDateRange.to || endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [periodFilter, customDateRange]);

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial-transactions", profile?.store_id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!profile?.store_id) return [];
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("store_id", profile.store_id)
        .gte("reference_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("reference_date", format(dateRange.end, "yyyy-MM-dd"))
        .order("reference_date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!profile?.store_id,
  });

  // Fetch orders for the period (to show revenue from sales)
  const { data: ordersRevenue = 0 } = useQuery({
    queryKey: ["orders-revenue", profile?.store_id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!profile?.store_id) return 0;
      
      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .eq("store_id", profile.store_id)
        .neq("status", "canceled")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;
      return data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    },
    enabled: !!profile?.store_id,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const incomeTransactions = transactions.filter(t => t.type === "income");
    const expenseTransactions = transactions.filter(t => t.type === "expense");
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalRevenue = ordersRevenue + totalIncome;
    const balance = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((balance / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalIncome,
      totalExpenses,
      balance,
      profitMargin,
      ordersRevenue,
    };
  }, [transactions, ordersRevenue]);

  // Group expenses by category for pie chart
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    transactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        grouped[t.category] = (grouped[t.category] || 0) + Number(t.amount);
      });
    
    return Object.entries(grouped).map(([category, amount]) => {
      const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === category);
      return {
        name: categoryInfo?.label || category,
        value: amount,
      };
    });
  }, [transactions]);

  // Daily chart data
  const dailyChartData = useMemo(() => {
    const days: Record<string, { date: string; income: number; expense: number }> = {};
    
    transactions.forEach(t => {
      const date = t.reference_date;
      if (!days[date]) {
        days[date] = { date, income: 0, expense: 0 };
      }
      if (t.type === "income") {
        days[date].income += Number(t.amount);
      } else {
        days[date].expense += Number(t.amount);
      }
    });

    return Object.values(days)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
      }));
  }, [transactions]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Transaction>) => {
      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          store_id: profile?.store_id,
          type: transactionType,
          category: data.category,
          amount: data.amount,
          description: data.description,
          payment_method: data.payment_method,
          reference_date: format(formData.reference_date, "yyyy-MM-dd"),
          notes: data.notes,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Lançamento criado com sucesso!");
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao criar lançamento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Transaction>) => {
      if (!editingTransaction) return;
      
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          category: data.category,
          amount: data.amount,
          description: data.description,
          payment_method: data.payment_method,
          reference_date: format(formData.reference_date, "yyyy-MM-dd"),
          notes: data.notes,
        })
        .eq("id", editingTransaction.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Lançamento atualizado!");
      resetForm();
      setEditingTransaction(null);
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar lançamento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Lançamento excluído!");
    },
    onError: () => {
      toast.error("Erro ao excluir lançamento");
    },
  });

  const resetForm = () => {
    setFormData({
      category: "",
      amount: "",
      description: "",
      payment_method: "",
      reference_date: new Date(),
      notes: "",
    });
    setTransactionType("expense");
  };

  const handleOpenAddDialog = (type: TransactionType) => {
    resetForm();
    setTransactionType(type);
    setEditingTransaction(null);
    setIsAddDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setFormData({
      category: transaction.category,
      amount: String(transaction.amount),
      description: transaction.description || "",
      payment_method: transaction.payment_method || "",
      reference_date: parseISO(transaction.reference_date),
      notes: transaction.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    const amount = parseFloat(formData.amount.replace(",", "."));
    if (!formData.category || isNaN(amount) || amount <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const data = {
      category: formData.category,
      amount,
      description: formData.description || null,
      payment_method: formData.payment_method || null,
      notes: formData.notes || null,
    };

    if (editingTransaction) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Format amount input
  const handleAmountChange = (value: string) => {
    // Remove non-numeric characters except comma and dot
    const cleaned = value.replace(/[^\d,.-]/g, "");
    setFormData(prev => ({ ...prev, amount: cleaned }));
  };

  const categories = transactionType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Controle de entradas e saídas</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => handleOpenAddDialog("income")} className="gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-600" />
            Entrada
          </Button>
          
          <Button variant="outline" onClick={() => handleOpenAddDialog("expense")} className="gap-2">
            <ArrowDownRight className="h-4 w-4 text-red-600" />
            Saída
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Vendas: {formatCurrency(metrics.ordersRevenue)} + Entradas: {formatCurrency(metrics.totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.type === "expense").length} lançamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              metrics.balance >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(metrics.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita - Despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              metrics.profitMargin >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {metrics.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro sobre receita
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
                <CardDescription>Entradas e saídas por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {dailyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis 
                          className="text-xs" 
                          tickFormatter={(value) => `R$ ${value}`}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Legend />
                        <Bar 
                          dataKey="income" 
                          name="Entradas" 
                          fill={CHART_COLORS.income} 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="expense" 
                          name="Saídas" 
                          fill={CHART_COLORS.expense} 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhum lançamento no período
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição das saídas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {expensesByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhuma despesa no período
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos</CardTitle>
              <CardDescription>
                {transactions.length} registros no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Forma Pgto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum lançamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => {
                        const categoryInfo = (transaction.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)
                          .find(c => c.value === transaction.category);
                        const paymentInfo = PAYMENT_METHODS.find(p => p.value === transaction.payment_method);
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(parseISO(transaction.reference_date), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.type === "income" ? "default" : "destructive"}>
                                {transaction.type === "income" ? "Entrada" : "Saída"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {categoryInfo && <categoryInfo.icon className="h-4 w-4 text-muted-foreground" />}
                                {categoryInfo?.label || transaction.category}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {transaction.description || "-"}
                            </TableCell>
                            <TableCell>
                              {paymentInfo?.label || transaction.payment_method || "-"}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              transaction.type === "income" ? "text-green-600" : "text-red-600"
                            )}>
                              {transaction.type === "income" ? "+" : "-"}{formatCurrency(Number(transaction.amount))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditTransaction(transaction)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Excluir este lançamento?")) {
                                      deleteMutation.mutate(transaction.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transactionType === "income" ? (
                <>
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                  {editingTransaction ? "Editar Entrada" : "Nova Entrada"}
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                  {editingTransaction ? "Editar Saída" : "Nova Saída"}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.reference_date, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.reference_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, reference_date: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <method.icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Pagamento fornecedor X"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionais (opcional)"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingTransaction ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}