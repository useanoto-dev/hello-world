import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, MessageSquare, Send, Edit2, X, Store } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  feedback: string | null;
  store_response: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

export default function ReviewsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [userRating, setUserRating] = useState(5);
  const [userFeedback, setUserFeedback] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Load store and reviews
  useEffect(() => {
    if (!slug) return;

    const loadData = async () => {
      setLoading(true);
      
      // Fetch store
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, primary_color")
        .eq("slug", slug)
        .maybeSingle();

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStore(storeData);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, feedback, store_response, response_at, created_at, updated_at")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false });

      setReviews(reviewsData || []);
      setLoading(false);
    };

    loadData();

    // Load saved phone
    const savedPhone = localStorage.getItem("anoto_customer_phone");
    if (savedPhone) setUserPhone(savedPhone);
  }, [slug]);

  // Real-time updates
  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel("reviews-page-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `store_id=eq.${store.id}` },
        () => fetchReviews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id]);

  const fetchReviews = async () => {
    if (!store?.id) return;
    
    const { data } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, feedback, store_response, response_at, created_at, updated_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    setReviews(data || []);
  };

  const checkExistingReview = async () => {
    if (!userPhone || userPhone.length < 10) {
      toast.error("Digite um telefone válido");
      return;
    }

    const cleanPhone = userPhone.replace(/\D/g, "");

    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("store_id", store?.id)
      .eq("customer_phone", cleanPhone)
      .maybeSingle();

    if (data) {
      setExistingReview(data as Review);
      setUserName(data.customer_name);
      setUserRating(data.rating);
      setUserFeedback(data.feedback || "");
      setIsEditing(true);
    } else {
      setExistingReview(null);
      setIsEditing(false);
      
      const { data: customerData } = await supabase
        .from("customers")
        .select("name")
        .eq("store_id", store?.id)
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (customerData) {
        setUserName(customerData.name);
      }
    }

    setPhoneVerified(true);
    localStorage.setItem("anoto_customer_phone", cleanPhone);
  };

  const handleSubmit = async () => {
    if (!userName.trim()) {
      toast.error("Digite seu nome");
      return;
    }

    setSubmitting(true);
    const cleanPhone = userPhone.replace(/\D/g, "");

    try {
      if (isEditing && existingReview) {
        const { error } = await supabase
          .from("reviews")
          .update({
            customer_name: userName.trim(),
            rating: userRating,
            feedback: userFeedback.trim() || null,
          })
          .eq("id", existingReview.id);

        if (error) throw error;
        toast.success("Avaliação atualizada!");
      } else {
        const { error } = await supabase.from("reviews").insert({
          store_id: store?.id,
          customer_phone: cleanPhone,
          customer_name: userName.trim(),
          rating: userRating,
          feedback: userFeedback.trim() || null,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error("Você já avaliou este estabelecimento");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Avaliação enviada!");
      }

      setShowForm(false);
      setPhoneVerified(false);
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      dist[r.rating as keyof typeof dist]++;
    });
    return dist;
  }, [reviews]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Estabelecimento não encontrado</p>
          <Link to="/" className="text-primary hover:underline mt-2 inline-block">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to={`/cardapio/${slug}`}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <h1 className="font-semibold text-lg">Avaliações</h1>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs w-3">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: (5 - rating) * 0.1 }}
                        className="h-full bg-yellow-400 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Review Button */}
          <Button
            className="w-full mt-4 gap-2"
            onClick={() => setShowForm(true)}
          >
            <MessageSquare className="h-4 w-4" />
            Avaliar {store.name}
          </Button>
        </motion.div>
      </div>

      {/* Reviews List */}
      <div className="px-4 space-y-3">
        {reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">Nenhuma avaliação ainda</p>
            <p className="text-sm text-muted-foreground">Seja o primeiro a avaliar!</p>
          </motion.div>
        ) : (
          reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{review.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                    {review.updated_at !== review.created_at && " (editado)"}
                  </p>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {review.feedback && (
                <p className="text-sm text-muted-foreground">{review.feedback}</p>
              )}

              {/* Store Response */}
              {review.store_response && (
                <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg py-2 pr-2">
                  <p className="text-xs font-medium text-primary mb-1">
                    Resposta de {store.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{review.store_response}</p>
                  {review.response_at && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(review.response_at)}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isEditing ? "Editar Avaliação" : "Avaliar"} {store.name}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowForm(false);
                    setPhoneVerified(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!phoneVerified ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Digite seu telefone para continuar
                  </p>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                  <Button className="w-full" onClick={checkExistingReview}>
                    Continuar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Seu nome</label>
                    <Input
                      placeholder="Seu nome"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sua avaliação</label>
                    <div className="flex justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-10 w-10 cursor-pointer transition-all hover:scale-110 ${
                            star <= userRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                          onClick={() => setUserRating(star)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Comentário (opcional)
                    </label>
                    <Textarea
                      placeholder="Conte sua experiência..."
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        {isEditing ? <Edit2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        {isEditing ? "Atualizar Avaliação" : "Enviar Avaliação"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
