// Orders Status Filters - Extracted from OrdersPage
import { memo } from 'react';
import { Filter, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  status: string;
}

interface OrdersStatusFiltersProps {
  orders: Order[];
  filter: string;
  onFilterChange: (filter: string) => void;
  periodFilter: string;
  showPeriodMenu: boolean;
  onTogglePeriodMenu: () => void;
  onPeriodChange: (period: string) => void;
  customDateStart: Date | null;
  customDateEnd: Date | null;
  onClearPeriod: () => void;
  onShowDatePicker: (type: 'start' | 'end') => void;
  useComandaMode: boolean;
}

const filterConfigs = [
  { 
    value: "active", 
    label: "Ativos", 
    activeColor: "bg-green-500 text-white", 
    inactiveColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
  },
  { 
    value: "pending", 
    label: "Pendentes", 
    activeColor: "bg-yellow-500 text-white", 
    inactiveColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" 
  },
  { 
    value: "completed", 
    label: "Concluídos", 
    activeColor: "bg-green-500 text-white", 
    inactiveColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
  }
];

const periodConfigs = [
  { value: "day", label: "Hoje" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este Mês" },
  { value: "year", label: "Este Ano" },
  { value: "custom", label: "Período Personalizado" }
];

export const OrdersStatusFilters = memo(function OrdersStatusFilters({
  orders,
  filter,
  onFilterChange,
  periodFilter,
  showPeriodMenu,
  onTogglePeriodMenu,
  onPeriodChange,
  customDateStart,
  customDateEnd,
  onClearPeriod,
  onShowDatePicker,
  useComandaMode,
}: OrdersStatusFiltersProps) {
  const getFilterCount = (filterValue: string) => {
    return orders.filter(o => {
      if (filterValue === "active") return !["completed", "canceled"].includes(o.status);
      return o.status === filterValue;
    }).length;
  };

  if (!useComandaMode) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {filterConfigs.map(f => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={cn(
              "px-4 py-2 text-sm md:px-3 md:py-1 md:text-xs rounded-lg font-medium shadow-sm",
              filter === f.value ? f.activeColor : f.inactiveColor
            )}
          >
            {f.label}
            <span className="ml-1.5 opacity-80">
              {getFilterCount(f.value)}
            </span>
          </button>
        ))}

        {/* Period Filter Button */}
        <div className="relative ml-auto">
          <button
            onClick={onTogglePeriodMenu}
            className="flex items-center gap-1.5 px-4 py-2 text-sm md:px-3 md:py-1 md:text-xs rounded-lg bg-muted/80 font-medium"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </button>

          {showPeriodMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[180px] py-1">
              {periodConfigs.map(p => (
                <button
                  key={p.value}
                  onClick={() => {
                    if (p.value === "custom") {
                      onShowDatePicker("start");
                    }
                    onPeriodChange(p.value);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                    periodFilter === p.value && "bg-muted font-medium"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Period Info Badge */}
      {periodFilter !== "day" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {periodFilter === "week" && "Esta Semana"}
            {periodFilter === "month" && "Este Mês"}
            {periodFilter === "year" && "Este Ano"}
            {periodFilter === "custom" && customDateStart && customDateEnd && 
              `${format(customDateStart, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateEnd, "dd/MM/yyyy", { locale: ptBR })}`
            }
          </Badge>
          <button
            onClick={onClearPeriod}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar
          </button>
        </div>
      )}
    </>
  );
});
