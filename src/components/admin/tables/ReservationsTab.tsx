import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Phone, Users, Clock, CheckCircle, XCircle, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isTomorrow, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Table {
  id: string;
  number: string;
  name: string | null;
  capacity: number;
}

interface Reservation {
  id: string;
  table_id: string;
  customer_name: string;
  customer_phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  notes: string | null;
  confirmed_at: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
  tables: Table[];
  onTableStatusChange: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-500/20 text-amber-600" },
  confirmed: { label: "Confirmada", color: "bg-emerald-500/20 text-emerald-600" },
  cancelled: { label: "Cancelada", color: "bg-red-500/20 text-red-600" },
  completed: { label: "Concluída", color: "bg-blue-500/20 text-blue-600" },
  no_show: { label: "Não compareceu", color: "bg-gray-500/20 text-gray-600" },
};

export default function ReservationsTab({ storeId, tables, onTableStatusChange }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [formData, setFormData] = useState({
    table_id: "",
    customer_name: "",
    customer_phone: "",
    reservation_date: format(new Date(), "yyyy-MM-dd"),
    reservation_time: "19:00",
    party_size: 2,
    notes: "",
  });

  const loadReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("table_reservations")
        .select("*")
        .eq("store_id", storeId)
        .gte("reservation_date", selectedDate)
        .lte("reservation_date", format(addDays(parseISO(selectedDate), 7), "yyyy-MM-dd"))
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Error loading reservations:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedDate]);

  useEffect(() => {
    loadReservations();

    const channel = supabase
      .channel("reservations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_reservations", filter: `store_id=eq.${storeId}` }, () => {
        loadReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, loadReservations]);

  const handleCreateReservation = async () => {
    if (!formData.table_id || !formData.customer_name || !formData.customer_phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { error } = await supabase.from("table_reservations").insert({
        store_id: storeId,
        table_id: formData.table_id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        party_size: formData.party_size,
        notes: formData.notes || null,
        status: "pending",
      });

      if (error) throw error;

      // Update table status to reserved
      await supabase
        .from("tables")
        .update({ status: "reserved" })
        .eq("id", formData.table_id);

      toast.success("Reserva criada com sucesso!");
      setIsCreateOpen(false);
      resetForm();
      loadReservations();
      onTableStatusChange();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar reserva");
    }
  };

  const handleConfirmReservation = async (reservation: Reservation) => {
    try {
      const { error } = await supabase
        .from("table_reservations")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", reservation.id);

      if (error) throw error;
      toast.success("Reserva confirmada!");
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || "Erro ao confirmar reserva");
    }
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    try {
      const { error } = await supabase
        .from("table_reservations")
        .update({ status: "cancelled" })
        .eq("id", reservation.id);

      if (error) throw error;

      // Free up the table
      await supabase
        .from("tables")
        .update({ status: "available" })
        .eq("id", reservation.table_id);

      toast.success("Reserva cancelada");
      loadReservations();
      onTableStatusChange();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar reserva");
    }
  };

  const handleCheckIn = async (reservation: Reservation) => {
    try {
      const { error } = await supabase
        .from("table_reservations")
        .update({ status: "completed" })
        .eq("id", reservation.id);

      if (error) throw error;

      // Mark table as occupied
      await supabase
        .from("tables")
        .update({ status: "occupied" })
        .eq("id", reservation.table_id);

      toast.success("Cliente chegou! Mesa ocupada.");
      loadReservations();
      onTableStatusChange();
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer check-in");
    }
  };

  const handleNoShow = async (reservation: Reservation) => {
    try {
      const { error } = await supabase
        .from("table_reservations")
        .update({ status: "no_show" })
        .eq("id", reservation.id);

      if (error) throw error;

      await supabase
        .from("tables")
        .update({ status: "available" })
        .eq("id", reservation.table_id);

      toast.success("Reserva marcada como não compareceu");
      loadReservations();
      onTableStatusChange();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar reserva");
    }
  };

  const resetForm = () => {
    setFormData({
      table_id: "",
      customer_name: "",
      customer_phone: "",
      reservation_date: format(new Date(), "yyyy-MM-dd"),
      reservation_time: "19:00",
      party_size: 2,
      notes: "",
    });
  };

  const getTableNumber = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table?.number || "?";
  };

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  // Group reservations by date
  const groupedReservations = reservations.reduce((acc, res) => {
    if (!acc[res.reservation_date]) {
      acc[res.reservation_date] = [];
    }
    acc[res.reservation_date].push(res);
    return acc;
  }, {} as Record<string, Reservation[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">
            {reservations.length} reserva{reservations.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Reserva
        </Button>
      </div>

      {/* Reservations List */}
      {Object.keys(groupedReservations).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mb-4 opacity-30" />
          <p>Nenhuma reserva encontrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedReservations).map(([date, dateReservations]) => (
            <div key={date}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 capitalize">
                {formatDateLabel(date)}
              </h3>
              <div className="grid gap-3">
                {dateReservations.map((reservation) => {
                  const config = statusConfig[reservation.status] || statusConfig.pending;
                  
                  return (
                    <Card key={reservation.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold">Mesa {getTableNumber(reservation.table_id)}</span>
                            <Badge className={config.color}>{config.label}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>{reservation.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{reservation.reservation_time.slice(0, 5)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{reservation.customer_phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>{reservation.party_size} pessoa{reservation.party_size !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          
                          {reservation.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">"{reservation.notes}"</p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {reservation.status === "pending" && (
                              <DropdownMenuItem onClick={() => handleConfirmReservation(reservation)}>
                                <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                                Confirmar
                              </DropdownMenuItem>
                            )}
                            {(reservation.status === "pending" || reservation.status === "confirmed") && (
                              <>
                                <DropdownMenuItem onClick={() => handleCheckIn(reservation)}>
                                  <Users className="w-4 h-4 mr-2 text-blue-500" />
                                  Cliente Chegou
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleNoShow(reservation)}>
                                  <XCircle className="w-4 h-4 mr-2 text-gray-500" />
                                  Não Compareceu
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCancelReservation(reservation)}
                                  className="text-destructive"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancelar Reserva
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Reservation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mesa *</Label>
              <Select
                value={formData.table_id}
                onValueChange={(v) => setFormData(f => ({ ...f, table_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a mesa" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      Mesa {table.number} {table.name ? `(${table.name})` : ""} - {table.capacity} lugares
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.reservation_date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setFormData(f => ({ ...f, reservation_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={formData.reservation_time}
                  onChange={(e) => setFormData(f => ({ ...f, reservation_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Nome do cliente *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(f => ({ ...f, customer_phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Pessoas</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.party_size}
                  onChange={(e) => setFormData(f => ({ ...f, party_size: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Aniversário, restrições alimentares, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateReservation}>Criar Reserva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
