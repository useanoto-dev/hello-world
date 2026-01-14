// Orders Hourly Sales Chart - Extracted from OrdersPage
import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getHours } from 'date-fns';

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

interface OrdersHourlyChartProps {
  orders: Order[];
}

export const OrdersHourlyChart = memo(function OrdersHourlyChart({
  orders,
}: OrdersHourlyChartProps) {
  const salesByHourData = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== "canceled");
    const hourlyData: Record<number, { orders: number; sales: number }> = {};
    
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { orders: 0, sales: 0 };
    }
    
    validOrders.forEach(order => {
      const hour = getHours(new Date(order.created_at));
      hourlyData[hour].orders += 1;
      hourlyData[hour].sales += order.total;
    });
    
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: `${hour}h`,
        hourNum: parseInt(hour),
        orders: data.orders,
        sales: data.sales
      }))
      .filter(d => d.hourNum >= 8 && d.hourNum <= 23);
  }, [orders]);

  const hasData = orders.filter(o => o.status !== "canceled").length > 0;

  if (!hasData) return null;

  return (
    <Card className="border-border/40 hidden md:block">
      <CardContent className="p-3">
        <h3 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Vendas por Hora
        </h3>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByHourData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 8 }} 
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis 
                tick={{ fontSize: 8 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
                width={30}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded px-2 py-1 shadow-lg">
                        <p className="text-xs font-medium">{data.hour} - {data.orders} pedido(s)</p>
                        <p className="text-xs font-bold text-emerald-500">R$ {data.sales.toFixed(0)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="sales" radius={[2, 2, 0, 0]}>
                {salesByHourData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.sales > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                    fillOpacity={entry.sales > 0 ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
