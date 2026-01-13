// Reviews Manager - Admin Panel
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, MessageSquare, Send, Search, Filter,
  TrendingUp, Users, Clock, Reply, BarChart3, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ReviewsAnalyticsChart } from "./charts/ReviewsAnalyticsChart";

interface Review {
  id: string;
  customer_name: string;
  customer_phone: string;
  rating: number;
  feedback: string | null;
  store_response: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewsManagerProps {
  storeId: string;
}

export function ReviewsManager({ storeId }: ReviewsManagerProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterResponse, setFilterResponse] = useState<string>("all");
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (storeId) {
      loadReviews();
      
      // Real-time subscription
      const channel = supabase
        .channel("admin-reviews")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reviews", filter: `store_id=eq.${storeId}` },
          () => loadReviews()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [storeId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Erro ao carregar avaliações");
    } finally {
      setLoading(false);
    }
  };

  const openReplyModal = (review: Review) => {
    setReplyingTo(review);
    setResponseText(review.store_response || "");
  };

  const submitResponse = async () => {
    if (!replyingTo) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          store_response: responseText.trim() || null,
          response_at: responseText.trim() ? new Date().toISOString() : null,
        })
        .eq("id", replyingTo.id);

      if (error) throw error;

      toast.success(responseText.trim() ? "Resposta enviada!" : "Resposta removida!");
      setReplyingTo(null);
      setResponseText("");
      loadReviews();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculations
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  const respondedCount = reviews.filter(r => r.store_response).length;
  const pendingCount = totalReviews - respondedCount;
  
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: totalReviews > 0 
      ? (reviews.filter(r => r.rating === rating).length / totalReviews) * 100 
      : 0
  }));

  // Filtered reviews
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (review.feedback?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const matchesRating = filterRating === "all" || review.rating === parseInt(filterRating);
    
    const matchesResponse = 
      filterResponse === "all" ||
      (filterResponse === "responded" && review.store_response) ||
      (filterResponse === "pending" && !review.store_response);

    return matchesSearch && matchesRating && matchesResponse;
  });

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="list" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="list" className="gap-2">
          <List className="w-4 h-4" />
          Lista de Avaliações
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Relatório Mensal
        </TabsTrigger>
      </TabsList>

      {/* Analytics Tab */}
      <TabsContent value="analytics">
        <ReviewsAnalyticsChart reviews={reviews} />
      </TabsContent>

      {/* List Tab */}
      <TabsContent value="list" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Star className="w-4 h-4" />
            Média Geral
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
            {renderStars(Math.round(averageRating))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Users className="w-4 h-4" />
            Total de Avaliações
          </div>
          <span className="text-2xl font-bold">{totalReviews}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <MessageSquare className="w-4 h-4" />
            Respondidas
          </div>
          <span className="text-2xl font-bold text-green-500">{respondedCount}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock className="w-4 h-4" />
            Aguardando Resposta
          </div>
          <span className="text-2xl font-bold text-amber-500">{pendingCount}</span>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Distribuição de Notas
        </h3>
        <div className="space-y-2">
          {ratingCounts.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="w-8 text-sm font-medium">{rating}★</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: (5 - rating) * 0.1 }}
                  className={`h-full ${
                    rating >= 4 ? "bg-green-500" : rating === 3 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                />
              </div>
              <span className="w-12 text-sm text-muted-foreground text-right">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou comentário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Nota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as notas</SelectItem>
            <SelectItem value="5">5 estrelas</SelectItem>
            <SelectItem value="4">4 estrelas</SelectItem>
            <SelectItem value="3">3 estrelas</SelectItem>
            <SelectItem value="2">2 estrelas</SelectItem>
            <SelectItem value="1">1 estrela</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterResponse} onValueChange={setFilterResponse}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Sem resposta</SelectItem>
            <SelectItem value="responded">Respondidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search || filterRating !== "all" || filterResponse !== "all"
              ? "Nenhuma avaliação encontrada com os filtros"
              : "Nenhuma avaliação recebida ainda"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="p-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {review.customer_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{review.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      {review.store_response ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Respondida
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Review Content */}
                  {review.feedback && (
                    <p className="text-sm text-muted-foreground mb-3 bg-muted/50 p-3 rounded-lg">
                      "{review.feedback}"
                    </p>
                  )}

                  {/* Store Response */}
                  {review.store_response && (
                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg mb-3">
                      <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                        <Reply className="w-4 h-4" />
                        Sua resposta
                      </div>
                      <p className="text-sm">{review.store_response}</p>
                      {review.response_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Respondido em {format(new Date(review.response_at), "dd/MM/yy 'às' HH:mm")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReplyModal(review)}
                      className="gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      {review.store_response ? "Editar Resposta" : "Responder"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://wa.me/55${review.customer_phone.replace(/\D/g, '')}`, '_blank')}
                    >
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Reply Modal */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Avaliação</DialogTitle>
          </DialogHeader>

          {replyingTo && (
            <div className="space-y-4">
              {/* Original Review */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{replyingTo.customer_name}</p>
                  {renderStars(replyingTo.rating)}
                </div>
                {replyingTo.feedback && (
                  <p className="text-sm text-muted-foreground italic">"{replyingTo.feedback}"</p>
                )}
              </div>

              {/* Response Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">Sua resposta</label>
                <Textarea
                  placeholder="Escreva sua resposta ao cliente..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta resposta será visível publicamente no cardápio
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingTo(null)}>
              Cancelar
            </Button>
            <Button onClick={submitResponse} disabled={submitting} className="gap-2">
              {submitting ? "Enviando..." : (
                <>
                  <Send className="w-4 h-4" />
                  {responseText.trim() ? "Enviar Resposta" : "Remover Resposta"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>
    </Tabs>
  );
}
