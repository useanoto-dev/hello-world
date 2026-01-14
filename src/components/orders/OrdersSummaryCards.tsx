// Orders Summary Cards Component - Extracted from OrdersPage
import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface FinancialSummary {
  totalSold: number;
  totalOrders: number;
  averageTicket: number;
}

interface OrdersSummaryCardsProps {
  summary: FinancialSummary;
}

export const OrdersSummaryCards = memo(function OrdersSummaryCards({
  summary,
}: OrdersSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
      <Card className="border-border/40">
        <CardContent className="p-2 md:p-2.5">
          <p className="text-[8px] md:text-[9px] text-muted-foreground uppercase tracking-wide">
            Vendas
          </p>
          <p className="text-sm md:text-base font-semibold text-emerald-600 dark:text-emerald-400">
            R$ {summary.totalSold.toFixed(0)}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/40">
        <CardContent className="p-2 md:p-2.5">
          <p className="text-[8px] md:text-[9px] text-muted-foreground uppercase tracking-wide">
            Pedidos
          </p>
          <p className="text-sm md:text-base font-semibold">
            {summary.totalOrders}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/40">
        <CardContent className="p-2 md:p-2.5">
          <p className="text-[8px] md:text-[9px] text-muted-foreground uppercase tracking-wide">
            Ticket
          </p>
          <p className="text-sm md:text-base font-semibold">
            R$ {summary.averageTicket.toFixed(0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
});
