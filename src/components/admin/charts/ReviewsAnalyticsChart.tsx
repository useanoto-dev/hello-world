// Reviews Analytics Chart - Monthly Evolution
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Minus, Calendar,
  Star, Users, MessageSquare, ArrowUp, ArrowDown
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  feedback: string | null;
  store_response: string | null;
  created_at: string;
}

interface ReviewsAnalyticsChartProps {
  reviews: Review[];
}

export function ReviewsAnalyticsChart({ reviews }: ReviewsAnalyticsChartProps) {
  const [period, setPeriod] = useState<string>("6");

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const months = parseInt(period);
    const now = new Date();
    const intervals = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), months - 1),
      end: endOfMonth(now)
    });

    return intervals.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthReviews = reviews.filter(r => {
        const reviewDate = parseISO(r.created_at);
        return isWithinInterval(reviewDate, { start: monthStart, end: monthEnd });
      });

      const totalRating = monthReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = monthReviews.length > 0 ? totalRating / monthReviews.length : 0;
      const respondedCount = monthReviews.filter(r => r.store_response).length;
      const responseRate = monthReviews.length > 0 
        ? (respondedCount / monthReviews.length) * 100 
        : 0;

      return {
        month: format(monthStart, "MMM/yy", { locale: ptBR }),
        fullMonth: format(monthStart, "MMMM 'de' yyyy", { locale: ptBR }),
        count: monthReviews.length,
        avgRating: Number(avgRating.toFixed(2)),
        responseRate: Number(responseRate.toFixed(0)),
        rating5: monthReviews.filter(r => r.rating === 5).length,
        rating4: monthReviews.filter(r => r.rating === 4).length,
        rating3: monthReviews.filter(r => r.rating === 3).length,
        rating2: monthReviews.filter(r => r.rating === 2).length,
        rating1: monthReviews.filter(r => r.rating === 1).length,
      };
    });
  }, [reviews, period]);

  // Current vs Previous month comparison
  const comparison = useMemo(() => {
    if (monthlyData.length < 2) return null;
    
    const current = monthlyData[monthlyData.length - 1];
    const previous = monthlyData[monthlyData.length - 2];

    const ratingDiff = current.avgRating - previous.avgRating;
    const countDiff = current.count - previous.count;
    const responseDiff = current.responseRate - previous.responseRate;

    return {
      current,
      previous,
      ratingDiff,
      countDiff,
      responseDiff,
      ratingTrend: ratingDiff > 0 ? "up" : ratingDiff < 0 ? "down" : "stable",
      countTrend: countDiff > 0 ? "up" : countDiff < 0 ? "down" : "stable",
    };
  }, [monthlyData]);

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "text-green-500";
    if (trend === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  // Custom tooltip for line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.fullMonth}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Média:</span>
              <span className="font-medium flex items-center gap-1">
                {data.avgRating.toFixed(1)}
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{data.count} avaliações</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Respondidas:</span>
              <span className="font-medium">{data.responseRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Rating distribution colors
  const ratingColors = {
    rating5: "#22c55e",
    rating4: "#84cc16",
    rating3: "#eab308",
    rating2: "#f97316",
    rating1: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Evolução das Avaliações
        </h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Month Comparison Cards */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Média do Mês</span>
              {getTrendIcon(comparison.ratingTrend)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{comparison.current.avgRating.toFixed(1)}</span>
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
            <div className={`text-sm mt-1 flex items-center gap-1 ${getTrendColor(comparison.ratingTrend)}`}>
              {comparison.ratingDiff > 0 ? <ArrowUp className="w-3 h-3" /> : comparison.ratingDiff < 0 ? <ArrowDown className="w-3 h-3" /> : null}
              {comparison.ratingDiff !== 0 && (
                <span>{Math.abs(comparison.ratingDiff).toFixed(1)} vs mês anterior</span>
              )}
              {comparison.ratingDiff === 0 && <span>Igual ao mês anterior</span>}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avaliações do Mês</span>
              {getTrendIcon(comparison.countTrend)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{comparison.current.count}</span>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className={`text-sm mt-1 flex items-center gap-1 ${getTrendColor(comparison.countTrend)}`}>
              {comparison.countDiff > 0 ? <ArrowUp className="w-3 h-3" /> : comparison.countDiff < 0 ? <ArrowDown className="w-3 h-3" /> : null}
              {comparison.countDiff !== 0 && (
                <span>{Math.abs(comparison.countDiff)} vs mês anterior</span>
              )}
              {comparison.countDiff === 0 && <span>Igual ao mês anterior</span>}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Taxa de Resposta</span>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{comparison.current.responseRate}%</span>
            </div>
            <div className={`text-sm mt-1 ${comparison.responseDiff >= 0 ? "text-green-500" : "text-red-500"}`}>
              {comparison.responseDiff !== 0 && (
                <span>{comparison.responseDiff > 0 ? "+" : ""}{comparison.responseDiff}% vs mês anterior</span>
              )}
              {comparison.responseDiff === 0 && <span className="text-muted-foreground">Igual ao mês anterior</span>}
            </div>
          </motion.div>
        </div>
      )}

      {/* Average Rating Evolution Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Evolução da Nota Média
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="avgRating" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Reviews Count + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reviews Count per Month */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Quantidade por Mês
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} avaliações`, 'Total']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === monthlyData.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Distribution Stacked */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Distribuição por Nota
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    const stars = name.replace('rating', '');
                    return [`${value}`, `${stars} estrelas`];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  formatter={(value) => `${value.replace('rating', '')}★`}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="rating5" stackId="a" fill={ratingColors.rating5} />
                <Bar dataKey="rating4" stackId="a" fill={ratingColors.rating4} />
                <Bar dataKey="rating3" stackId="a" fill={ratingColors.rating3} />
                <Bar dataKey="rating2" stackId="a" fill={ratingColors.rating2} />
                <Bar dataKey="rating1" stackId="a" fill={ratingColors.rating1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
