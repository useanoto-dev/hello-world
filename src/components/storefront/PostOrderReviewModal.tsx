import { useState, useEffect } from "react";
import { Star, Send, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PostOrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  orderNumber: number;
  onReviewSubmitted?: () => void;
}

export function PostOrderReviewModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  customerName,
  customerPhone,
  orderNumber,
  onReviewSubmitted,
}: PostOrderReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState(customerName);
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Check if user already reviewed
  useEffect(() => {
    if (isOpen && customerPhone) {
      checkExistingReview();
    }
  }, [isOpen, customerPhone, storeId]);

  const checkExistingReview = async () => {
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const { data } = await supabase
      .from("reviews")
      .select("id")
      .eq("store_id", storeId)
      .eq("customer_phone", cleanPhone)
      .maybeSingle();

    if (data) {
      setExistingReview(data.id);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Selecione uma nota");
      return;
    }

    if (!name.trim()) {
      toast.error("Digite seu nome");
      return;
    }

    setSubmitting(true);
    const cleanPhone = customerPhone.replace(/\D/g, "");

    try {
      if (existingReview) {
        const { error } = await supabase
          .from("reviews")
          .update({
            customer_name: name.trim(),
            rating,
            feedback: feedback.trim() || null,
          })
          .eq("id", existingReview);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          store_id: storeId,
          customer_phone: cleanPhone,
          customer_name: name.trim(),
          rating,
          feedback: feedback.trim() || null,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error("Você já avaliou este estabelecimento");
            onClose();
            return;
          }
          throw error;
        }
      }

      setSubmitted(true);
      onReviewSubmitted?.();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const getRatingText = (r: number) => {
    switch (r) {
      case 1: return "Muito ruim 😞";
      case 2: return "Ruim 😕";
      case 3: return "Regular 😐";
      case 4: return "Bom 😊";
      case 5: return "Excelente! 🤩";
      default: return "Toque nas estrelas";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="w-10 h-10 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold mb-2">Obrigado pela avaliação!</h3>
                <p className="text-muted-foreground">
                  Sua opinião é muito importante para nós
                </p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"
                  >
                    <Star className="w-8 h-8 text-primary" />
                  </motion.div>
                  
                  <h3 className="text-lg font-bold">Como foi seu pedido?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pedido #{orderNumber} em {storeName}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  {/* Star Rating */}
                  <div className="text-center">
                    <div className="flex justify-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-10 w-10 transition-all duration-200 ${
                              star <= displayRating
                                ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </motion.button>
                      ))}
                    </div>
                    <motion.p
                      key={displayRating}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-medium text-muted-foreground"
                    >
                      {getRatingText(displayRating)}
                    </motion.p>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Seu nome</label>
                    <Input
                      placeholder="Como quer ser identificado?"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Comentário <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <Textarea
                      placeholder="Conte como foi sua experiência..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                  >
                    {submitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Star className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {submitting ? "Enviando..." : existingReview ? "Atualizar Avaliação" : "Enviar Avaliação"}
                  </Button>

                  <button
                    onClick={onClose}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Avaliar depois
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
