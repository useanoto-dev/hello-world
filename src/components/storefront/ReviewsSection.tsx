import { useState, useEffect } from "react";
import { Star, Edit2, Send, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

interface ReviewsSectionProps {
  storeId: string;
  storeName: string;
}

export function ReviewsSection({ storeId, storeName }: ReviewsSectionProps) {
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

  // Load saved phone from localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem("anoto_customer_phone");
    if (savedPhone) {
      setUserPhone(savedPhone);
    }
  }, []);

  // Fetch all reviews
  useEffect(() => {
    fetchReviews();

    const channel = supabase
      .channel("reviews-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `store_id=eq.${storeId}` },
        () => fetchReviews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, feedback, store_response, response_at, created_at, updated_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    setReviews(data || []);
    setLoading(false);
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
      .eq("store_id", storeId)
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
      // Try to get name from customers table
      const { data: customerData } = await supabase
        .from("customers")
        .select("name")
        .eq("store_id", storeId)
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
          store_id: storeId,
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

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const renderStars = (rating: number, interactive = false, onSelect?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 transition-colors ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            } ${interactive ? "cursor-pointer hover:scale-110" : ""}`}
            onClick={() => interactive && onSelect?.(star)}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with average */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {renderStars(Math.round(averageRating))}
          </div>
          <span className="text-lg font-semibold">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-muted-foreground">
            ({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Avaliar
        </Button>
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
              className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isEditing ? "Editar Avaliação" : "Avaliar"} {storeName}
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

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma avaliação ainda</p>
          <p className="text-sm">Seja o primeiro a avaliar!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-muted/30 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{review.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                    {review.updated_at !== review.created_at && " (editado)"}
                  </p>
                </div>
                {renderStars(review.rating)}
              </div>
              {review.feedback && (
                <p className="text-sm text-muted-foreground">{review.feedback}</p>
              )}
              
              {/* Store Response */}
              {review.store_response && (
                <div className="mt-3 pl-3 border-l-2 border-primary/30">
                  <p className="text-xs font-medium text-primary mb-1">Resposta do estabelecimento</p>
                  <p className="text-sm text-muted-foreground">{review.store_response}</p>
                  {review.response_at && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(review.response_at)}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
