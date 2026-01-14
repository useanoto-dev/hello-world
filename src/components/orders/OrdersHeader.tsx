// Orders Header Component - Extracted from OrdersPage
import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isToday, format, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrdersHeaderProps {
  activeOrdersCount: number;
  selectedDate: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

export const OrdersHeader = memo(function OrdersHeader({
  activeOrdersCount,
  selectedDate,
  onPreviousDay,
  onNextDay,
  onToday,
}: OrdersHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xs md:text-sm font-semibold">Pedidos</h1>
        <p className="text-[9px] md:text-[10px] text-muted-foreground">
          {activeOrdersCount} ativos
        </p>
      </div>
      
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 w-5 md:h-6 md:w-6 p-0" 
          onClick={onPreviousDay}
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>
        
        <Button 
          variant={isToday(selectedDate) ? "default" : "ghost"} 
          size="sm"
          onClick={onToday}
          className="h-5 md:h-6 text-[9px] md:text-[10px] px-1.5"
        >
          {isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd/MM", { locale: ptBR })}
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 w-5 md:h-6 md:w-6 p-0" 
          onClick={onNextDay}
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});
