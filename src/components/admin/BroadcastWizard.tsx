// Wizard de Disparo de Mensagens WhatsApp - Anotô SaaS
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, MessageSquare, Users, CheckCircle2, X, 
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Check, Search, Clock, XCircle, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPhone } from "@/lib/formatters";

interface Customer {
  id: string;
  name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
}

interface BroadcastWizardProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  customers: Customer[];
  filters?: {
    period?: string;
    spent?: string;
    orders?: string;
  };
}

interface MessageTemplate {
  id: string;
  label: string;
  emoji: string;
  message: string;
}

interface SendError {
  type: 'whatsapp_disconnected' | 'network' | 'timeout' | 'unknown';
  message: string;
  details?: string;
}

const defaultTemplates: MessageTemplate[] = [
  { 
    id: "promo", 
    label: "Promoção", 
    emoji: "🎉", 
    message: "Olá {nome}! 🍕\n\nTemos uma promoção especial para você! Confira nosso cardápio e aproveite os descontos exclusivos.\n\nAguardamos seu pedido! 🚀" 
  },
  { 
    id: "comeback", 
    label: "Retorno", 
    emoji: "🔄", 
    message: "Olá {nome}! 👋\n\nSentimos sua falta! Faz um tempo que você não nos visita.\n\nQue tal matar a saudade com um pedido especial? Estamos te esperando! 😋" 
  },
  { 
    id: "thanks", 
    label: "Agradecimento", 
    emoji: "💛", 
    message: "Olá {nome}! 😊\n\nGostaríamos de agradecer pela sua preferência!\n\nSua satisfação é muito importante para nós. Conte sempre conosco! 🙏" 
  },
  { 
    id: "loyalty", 
    label: "Fidelidade", 
    emoji: "🎁", 
    message: "Olá {nome}! 🎉\n\nVocê é um cliente especial!\n\nAproveite seus pontos de fidelidade no próximo pedido e ganhe benefícios exclusivos. Confira! 🏆" 
  },
  { 
    id: "custom", 
    label: "Personalizado", 
    emoji: "✏️", 
    message: "Olá {nome}!\n\n" 
  },
];

export function BroadcastWizard({ 
  open, 
  onClose, 
  storeId, 
  customers,
  filters 
}: BroadcastWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendStats, setSendStats] = useState({ sent: 0, failed: 0, total: 0 });
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<SendError | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTemplate(null);
      setMessageContent("");
      setSelectedCustomers(new Set(customers.map(c => c.id)));
      setSearchQuery("");
      setSending(false);
      setSendProgress(0);
      setSendStats({ sent: 0, failed: 0, total: 0 });
      setCampaignId(null);
      setSendError(null);
    }
  }, [open, customers]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = defaultTemplates.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.message);
    }
  };

  const toggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const selectAll = () => {
    setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedCustomers(new Set());
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const canProceedStep1 = messageContent.trim().length >= 10;
  const canProceedStep2 = selectedCustomers.size > 0;

  const parseErrorMessage = (error: any): SendError => {
    const message = error?.message || error?.error || String(error);
    
    if (message.includes('WhatsApp não está conectado') || message.includes('WhatsApp desconectado')) {
      return {
        type: 'whatsapp_disconnected',
        message: 'WhatsApp desconectado',
        details: 'Conecte seu WhatsApp em Integrações > WhatsApp antes de fazer disparos.'
      };
    }
    
    if (message.includes('WhatsApp não configurado')) {
      return {
        type: 'whatsapp_disconnected',
        message: 'WhatsApp não configurado',
        details: 'Configure e conecte seu WhatsApp em Integrações antes de fazer disparos.'
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Erro de conexão',
        details: 'Verifique sua conexão com a internet e tente novamente.'
      };
    }
    
    if (message.includes('timeout') || message.includes('Tempo limite')) {
      return {
        type: 'timeout',
        message: 'Tempo limite excedido',
        details: 'O envio demorou mais que o esperado. Algumas mensagens podem não ter sido enviadas.'
      };
    }
    
    return {
      type: 'unknown',
      message: 'Erro ao enviar mensagens',
      details: message || 'Ocorreu um erro inesperado. Tente novamente.'
    };
  };

  const startBroadcast = async () => {
    if (!canProceedStep2 || sending) return;

    setSending(true);
    setSendError(null);
    setStep(3); // Go to progress step
    const selectedList = customers.filter(c => selectedCustomers.has(c.id));
    setSendStats({ sent: 0, failed: 0, total: selectedList.length });
    setSendProgress(0);

    try {
      const { data: campaign, error: campaignError } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          store_id: storeId,
          name: `Disparo ${new Date().toLocaleDateString('pt-BR')}`,
          message_content: messageContent,
          filters: filters || {},
          status: "sending",
          total_recipients: selectedList.length,
          started_at: new Date().toISOString(),
          scheduled_at: null,
          is_recurring: false,
          recurring_days: null
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setCampaignId(campaign.id);

      const recipients = selectedList.map(c => ({
        campaign_id: campaign.id,
        customer_id: c.id,
        customer_phone: c.phone,
        customer_name: c.name,
        status: "pending"
      }));

      const { error: recipientsError } = await supabase
        .from("whatsapp_campaign_recipients")
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      // Start polling for immediate dispatch
      let pollInterval: ReturnType<typeof setInterval>;
      let isCompleted = false;
      let pollCount = 0;
      const MAX_POLLS = 300;

      const pollProgress = async () => {
        if (isCompleted) return;
        pollCount++;

        const { data: stats } = await supabase
          .from("whatsapp_campaign_recipients")
          .select("status, error_message")
          .eq("campaign_id", campaign.id);

        if (stats) {
          const sent = stats.filter(r => r.status === "sent").length;
          const failed = stats.filter(r => r.status === "failed").length;
          const total = stats.length;
          const processed = sent + failed;
          const progress = total > 0 ? (processed / total) * 100 : 0;

          setSendProgress(progress);
          setSendStats({ sent, failed, total });

          // Check for specific errors
          if (failed > 0 && sent === 0 && processed === total) {
            const firstError = stats.find(r => r.status === "failed")?.error_message;
            if (firstError) {
              setSendError(parseErrorMessage({ message: firstError }));
            }
          }

          if ((processed >= total && total > 0) || pollCount >= MAX_POLLS) {
            isCompleted = true;
            clearInterval(pollInterval);

            await supabase
              .from("whatsapp_campaigns")
              .update({ 
                status: failed === total ? "failed" : processed < total ? "timeout" : "completed",
                sent_count: sent,
                failed_count: failed,
                completed_at: new Date().toISOString()
              })
              .eq("id", campaign.id);

            if (failed === total) {
              setSendError(parseErrorMessage({ message: stats[0]?.error_message || 'Todas as mensagens falharam' }));
            } else if (pollCount >= MAX_POLLS && processed < total) {
              setSendError({
                type: 'timeout',
                message: 'Tempo limite atingido',
                details: `${sent} enviadas, ${failed} falhas, ${total - processed} ainda pendentes`
              });
            }
            
            setSending(false);
            setStep(4); // Success step
          }
        }
      };

      pollInterval = setInterval(pollProgress, 500);

      // Call edge function
      const { error: invokeError } = await supabase.functions.invoke("whatsapp_broadcast", { 
        body: { campaign_id: campaign.id } 
      });

      if (invokeError) {
        isCompleted = true;
        clearInterval(pollInterval);
        setSendError(parseErrorMessage(invokeError));
        setSending(false);
        setStep(4);
      }

      setTimeout(pollProgress, 300);

    } catch (error: any) {
      console.error("Broadcast error:", error);
      setSendError(parseErrorMessage(error));
      setSending(false);
      setStep(4);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium text-sm">Escolha ou escreva sua mensagem</h3>
        <p className="text-xs text-muted-foreground">Use {'{nome}'} para personalizar</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {defaultTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedTemplate === template.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="text-lg">{template.emoji}</span>
            <p className="text-xs font-medium mt-1">{template.label}</p>
          </button>
        ))}
      </div>

      <div>
        <Textarea
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          placeholder="Digite sua mensagem aqui..."
          className="min-h-[100px] text-sm"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            {messageContent.length} caracteres
          </p>
          {messageContent.length < 10 && (
            <p className="text-xs text-destructive">Mínimo 10 caracteres</p>
          )}
        </div>
      </div>

      {messageContent && (
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
          <p className="text-sm whitespace-pre-wrap">
            {messageContent.replace(/{nome}/gi, "João")}
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium text-sm">Selecione os destinatários</h3>
        <p className="text-xs text-muted-foreground">
          {selectedCustomers.size} de {customers.length} selecionados
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>Todos</Button>
        <Button variant="outline" size="sm" onClick={clearSelection}>Limpar</Button>
      </div>

      <ScrollArea className="h-[280px] border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                selectedCustomers.has(customer.id) ? "bg-primary/10" : "hover:bg-muted"
              }`}
              onClick={() => toggleCustomer(customer.id)}
            >
              <Checkbox
                checked={selectedCustomers.has(customer.id)}
                onCheckedChange={() => toggleCustomer(customer.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{formatPhone(customer.phone)}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{customer.total_orders} pedidos</p>
                <p>R$ {customer.total_spent.toFixed(0)}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Immediate send notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Send className="w-4 h-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700">Envio imediato</p>
            <p className="text-xs text-amber-600">
              As mensagens serão enviadas agora para {selectedCustomers.size} clientes
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium text-sm">
          {sending ? "Enviando mensagens..." : "Processando"}
        </h3>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="relative">
          <Progress value={sendProgress} className="h-4" />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {Math.round(sendProgress)}%
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            {sendStats.sent + sendStats.failed} de {sendStats.total} processadas
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 py-4">
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{sendStats.sent}</p>
            <p className="text-xs text-muted-foreground">Enviadas</p>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-500">{sendStats.failed}</p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold text-muted-foreground">
              {sendStats.total - sendStats.sent - sendStats.failed}
            </p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const hasError = sendError || sendStats.failed === sendStats.total;
    const isPartialSuccess = sendStats.sent > 0 && sendStats.failed > 0;

    return (
      <div className="text-center py-6 space-y-4">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          hasError && sendStats.sent === 0
            ? "bg-red-500/10"
            : isPartialSuccess
            ? "bg-amber-500/10"
            : "bg-green-500/10"
        }`}>
          {hasError && sendStats.sent === 0 ? (
            sendError?.type === 'whatsapp_disconnected' ? (
              <WifiOff className="w-8 h-8 text-red-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )
          ) : isPartialSuccess ? (
            <AlertCircle className="w-8 h-8 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-lg">
            {hasError && sendStats.sent === 0
              ? "Falha no Disparo"
              : isPartialSuccess
              ? "Disparo Parcial"
              : "Disparo Concluído!"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {hasError && sendStats.sent === 0
              ? sendError?.message || "Não foi possível enviar as mensagens"
              : isPartialSuccess
              ? "Algumas mensagens não foram enviadas"
              : "Sua campanha foi enviada com sucesso"}
          </p>
        </div>

        {/* Error Details */}
        {sendError && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-left">
            <p className="text-sm font-medium text-red-700">{sendError.message}</p>
            {sendError.details && (
              <p className="text-xs text-red-600 mt-1">{sendError.details}</p>
            )}
            {sendError.type === 'whatsapp_disconnected' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-red-600 border-red-300"
                onClick={() => {
                  onClose();
                  window.location.href = '/dashboard/integrations';
                }}
              >
                <Wifi className="w-3 h-3 mr-1" />
                Ir para Integrações
              </Button>
            )}
          </div>
        )}

        {/* Stats (only if some were sent) */}
        {(sendStats.sent > 0 || sendStats.failed > 0) && (
          <div className="flex justify-center gap-4">
            {sendStats.sent > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{sendStats.sent}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
            )}
            {sendStats.failed > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{sendStats.failed}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
            )}
          </div>
        )}

        <Button onClick={onClose} className="mt-4">
          Fechar
        </Button>
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {[1, 2].map(s => (
        <div key={s} className={`flex items-center ${s < 2 ? "gap-2" : ""}`}>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s < step ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 2 && (
            <div className={`w-8 h-0.5 ${s < step ? "bg-green-500" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Disparo de Mensagens
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator (only for steps 1-2) */}
        {step <= 2 && renderStepIndicator()}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation (only for steps 1-2) */}
        {step <= 2 && (
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              disabled={sending}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {step === 1 ? "Cancelar" : "Voltar"}
            </Button>

            {step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceedStep1}
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={startBroadcast}
                disabled={!canProceedStep2 || sending}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar agora
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
