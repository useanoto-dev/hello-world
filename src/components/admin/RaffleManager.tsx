import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Users, Calendar, Play, X, Sparkles, 
  Filter, Minus, Plus, CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/formatters";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface Participant {
  id: string;
  name: string;
  phone: string;
  total_orders: number;
  last_order_at: string | null;
}

interface RaffleManagerProps {
  storeId: string;
}

export function RaffleManager({ storeId }: RaffleManagerProps) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [winnersCount, setWinnersCount] = useState(1);
  const [countdownStart, setCountdownStart] = useState(5);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [winners, setWinners] = useState<Participant[]>([]);
  const [raffleComplete, setRaffleComplete] = useState(false);
  const [isYellow, setIsYellow] = useState(false);
  
  // Date filters
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (storeId) {
      loadParticipants();
    }
  }, [storeId]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, customer_phone, created_at")
        .eq("store_id", storeId)
        .neq("status", "canceled")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by phone to get unique customers
      const customerMap = new Map<string, Participant>();
      (data || []).forEach((order) => {
        const phone = order.customer_phone;
        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            id: phone,
            name: order.customer_name,
            phone: phone,
            total_orders: 1,
            last_order_at: order.created_at,
          });
        } else {
          const existing = customerMap.get(phone)!;
          existing.total_orders += 1;
          if (!existing.last_order_at || new Date(order.created_at) > new Date(existing.last_order_at)) {
            existing.last_order_at = order.created_at;
          }
        }
      });

      setParticipants(Array.from(customerMap.values()));
    } catch (error) {
      console.error("Error loading participants:", error);
      toast.error("Erro ao carregar participantes");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredParticipants = useCallback(() => {
    if (periodFilter === "all") return participants;

    const now = new Date();
    return participants.filter((p) => {
      if (!p.last_order_at) return false;
      const lastOrder = new Date(p.last_order_at);

      switch (periodFilter) {
        case "7days":
          return Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
        case "30days":
          return Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)) <= 30;
        case "1year":
          return Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)) <= 365;
        case "specific":
          if (!specificDate) return true;
          return isWithinInterval(lastOrder, {
            start: startOfDay(specificDate),
            end: endOfDay(specificDate),
          });
        case "range":
          if (!dateRange?.from) return true;
          const rangeEnd = dateRange.to || dateRange.from;
          return isWithinInterval(lastOrder, {
            start: startOfDay(dateRange.from),
            end: endOfDay(rangeEnd),
          });
        default:
          return true;
      }
    });
  }, [participants, periodFilter, specificDate, dateRange]);

  const filteredParticipants = getFilteredParticipants();

  const startRaffle = () => {
    if (filteredParticipants.length < winnersCount) {
      toast.error(`Precisa de pelo menos ${winnersCount} participantes`);
      return;
    }

    setShowFullscreen(true);
    setRaffleComplete(false);
    setWinners([]);
    setCurrentNumber(countdownStart);
    setIsYellow(false);
  };

  const launchBalloons = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        shapes: ['circle'],
        scalar: 2,
        drift: 0,
        gravity: 0.5,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        shapes: ['circle'],
        scalar: 2,
        drift: 0,
        gravity: 0.5,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors: colors,
      shapes: ['circle'],
      scalar: 2.5,
    });

    frame();
  };

  // Color flashing effect - separate from countdown
  useEffect(() => {
    if (!showFullscreen || raffleComplete) return;

    const colorInterval = setInterval(() => {
      setIsYellow((prev) => !prev);
    }, 500);

    return () => clearInterval(colorInterval);
  }, [showFullscreen, raffleComplete]);

  // Countdown logic - separate timer
  useEffect(() => {
    if (!showFullscreen || currentNumber === null || raffleComplete) return;

    if (currentNumber > 0) {
      const timer = setTimeout(() => {
        setCurrentNumber((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentNumber === 0) {
      // Select winners immediately when reaching 0
      const shuffled = [...filteredParticipants].sort(() => Math.random() - 0.5);
      const selectedWinners = shuffled.slice(0, winnersCount);
      setWinners(selectedWinners);
      setRaffleComplete(true);
      launchBalloons();
    }
  }, [showFullscreen, currentNumber, raffleComplete]);

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setCurrentNumber(null);
    setWinners([]);
    setRaffleComplete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Sorteio de Clientes
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecione clientes que fizeram pedidos e realize sorteios
          </p>
        </div>
      </div>

      {/* Filters & Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Period Filter */}
        <div className="space-y-3 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Período de Pedidos</Label>
          </div>
          <Select 
            value={periodFilter} 
            onValueChange={(value) => {
              setPeriodFilter(value);
              if (value !== "specific") setSpecificDate(undefined);
              if (value !== "range") setDateRange(undefined);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pedidos</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="1year">Último ano</SelectItem>
              <SelectItem value="specific">Data específica</SelectItem>
              <SelectItem value="range">Período personalizado</SelectItem>
            </SelectContent>
          </Select>

          {/* Specific Date Picker */}
          {periodFilter === "specific" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Selecione a data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !specificDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {specificDate ? format(specificDate, "dd/MM/yyyy", { locale: ptBR }) : "Escolha uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={specificDate}
                    onSelect={setSpecificDate}
                    locale={ptBR}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Date Range Picker */}
          {periodFilter === "range" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Selecione o período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      )
                    ) : (
                      "Escolha o período"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    locale={ptBR}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{filteredParticipants.length}</span>
            <span className="text-muted-foreground">participantes elegíveis</span>
          </div>
        </div>

        {/* Raffle Settings */}
        <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Configurações do Sorteio</Label>
          </div>

          {/* Winners Count */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quantidade de Ganhadores</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWinnersCount(Math.max(1, winnersCount - 1))}
                disabled={winnersCount <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">{winnersCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWinnersCount(Math.min(10, winnersCount + 1))}
                disabled={winnersCount >= 10}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Countdown Start */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Começar a contar de: <span className="font-bold text-foreground">{countdownStart}</span>
            </Label>
            <Slider
              value={[countdownStart]}
              onValueChange={(v) => setCountdownStart(v[0])}
              min={3}
              max={15}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>15</span>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Count */}
      {filteredParticipants.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <span className="text-3xl font-bold text-primary">{filteredParticipants.length}</span>
            <span className="text-muted-foreground">participantes elegíveis</span>
          </div>
        </div>
      )}

      {/* Start Button */}
      <Button
        size="lg"
        className="w-full gap-3 h-14 text-lg"
        onClick={startRaffle}
        disabled={loading || filteredParticipants.length < winnersCount}
      >
        <Play className="w-5 h-5" />
        Iniciar Sorteio
        {filteredParticipants.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            {filteredParticipants.length} participantes
          </Badge>
        )}
      </Button>

      {/* Fullscreen Raffle Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{ backgroundColor: isYellow ? "#FEF08A" : "#FFFFFF" }}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/10 hover:bg-black/20 rounded-full"
              onClick={closeFullscreen}
            >
              <X className="w-6 h-6" />
            </Button>

            <div className="h-full flex flex-col items-center justify-center p-8">
              {!raffleComplete ? (
                /* Countdown */
                <motion.div
                  key={currentNumber}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <motion.span
                    className="text-[20rem] font-black leading-none text-black"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    {currentNumber}
                  </motion.span>
                </motion.div>
              ) : (
                /* Winners */
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-8 max-w-2xl w-full"
                >
                  <motion.div
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <Trophy className="w-16 h-16 text-yellow-500" />
                    <h1 className="text-5xl font-black text-black">
                      {winners.length === 1 ? "VENCEDOR!" : "VENCEDORES!"}
                    </h1>
                    <Trophy className="w-16 h-16 text-yellow-500" />
                  </motion.div>

                  <div className="space-y-4">
                    {winners.map((winner, index) => (
                      <motion.div
                        key={winner.id}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.3 }}
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 rounded-2xl shadow-2xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl font-black text-yellow-600">
                            {index + 1}º
                          </div>
                          <div className="text-left text-white">
                            <p className="text-3xl font-bold">{winner.name}</p>
                            <p className="text-xl opacity-90">{formatPhone(winner.phone)}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: winners.length * 0.3 + 0.5 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="mt-8 h-14 px-12 text-lg bg-white hover:bg-gray-100 text-black"
                      onClick={closeFullscreen}
                    >
                      Fechar
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
