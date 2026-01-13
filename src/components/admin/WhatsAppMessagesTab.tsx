import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, User, Hash, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const VARIABLES = [
  { key: "{nome}", label: "Nome", icon: User },
  { key: "{pedido}", label: "Pedido", icon: Hash },
];

interface AutoMessage {
  id?: string;
  restaurant_id: string;
  status_pedido: string;
  mensagem: string;
  ativo: boolean;
}

interface WhatsAppMessagesTabProps {
  restaurantId: string | null;
}

const ORDER_STATUSES = [
  { key: "recebido", label: "Pedido Recebido", emoji: "📥" },
  { key: "preparando", label: "Preparando", emoji: "👨‍🍳" },
  { key: "pronto", label: "Pronto", emoji: "✅" },
  { key: "entregando", label: "Saiu p/ Entrega", emoji: "🚗" },
  { key: "entregue", label: "Entregue", emoji: "🎉" },
];

export default function WhatsAppMessagesTab({ restaurantId }: WhatsAppMessagesTabProps) {
  const [messages, setMessages] = useState<Record<string, AutoMessage>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    if (restaurantId) {
      loadMessages();
    }
  }, [restaurantId]);

  const loadMessages = async () => {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from("mensagens_automaticas_whatsapp")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      const messagesMap: Record<string, AutoMessage> = {};
      const expanded: Record<string, boolean> = {};
      
      ORDER_STATUSES.forEach((status) => {
        messagesMap[status.key] = {
          restaurant_id: restaurantId,
          status_pedido: status.key,
          mensagem: "",
          ativo: false,
        };
        expanded[status.key] = false;
      });

      data?.forEach((msg) => {
        messagesMap[msg.status_pedido] = {
          id: msg.id,
          restaurant_id: msg.restaurant_id,
          status_pedido: msg.status_pedido,
          mensagem: msg.mensagem,
          ativo: msg.ativo,
        };
        // Expand items that have content
        if (msg.mensagem) {
          expanded[msg.status_pedido] = true;
        }
      });

      setMessages(messagesMap);
      setExpandedItems(expanded);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  const updateMessage = (statusKey: string, field: "mensagem" | "ativo", value: string | boolean) => {
    setMessages((prev) => ({
      ...prev,
      [statusKey]: {
        ...prev[statusKey],
        [field]: value,
      },
    }));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, statusKey: string) => {
    if (e.key === "/") {
      setShowVariables(statusKey);
    } else if (e.key === "Escape") {
      setShowVariables(null);
    }
  };

  const insertVariable = (statusKey: string, variable: string) => {
    const textarea = textareaRefs.current[statusKey];
    if (!textarea) return;

    const currentMessage = messages[statusKey]?.mensagem || "";
    const cursorPos = textarea.selectionStart || currentMessage.length;
    
    const beforeSlash = currentMessage.slice(0, cursorPos).replace(/\/$/, "");
    const afterCursor = currentMessage.slice(cursorPos);
    
    const newMessage = beforeSlash + variable + afterCursor;
    updateMessage(statusKey, "mensagem", newMessage);
    setShowVariables(null);

    setTimeout(() => {
      textarea.focus();
      const newPos = beforeSlash.length + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const saveMessage = async (statusKey: string) => {
    if (!restaurantId) return;

    const message = messages[statusKey];
    setSaving(statusKey);

    try {
      if (message.id) {
        const { error } = await supabase
          .from("mensagens_automaticas_whatsapp")
          .update({
            mensagem: message.mensagem,
            ativo: message.ativo,
          })
          .eq("id", message.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("mensagens_automaticas_whatsapp")
          .insert({
            restaurant_id: restaurantId,
            status_pedido: statusKey,
            mensagem: message.mensagem,
            ativo: message.ativo,
          })
          .select()
          .single();

        if (error) throw error;

        setMessages((prev) => ({
          ...prev,
          [statusKey]: {
            ...prev[statusKey],
            id: data.id,
          },
        }));
      }

      toast.success("Salvo!");
    } catch (error) {
      console.error("Error saving message:", error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        Selecione um restaurante
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Compact info */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md text-[10px] text-muted-foreground">
        <span>Variáveis:</span>
        <code className="bg-background px-1 rounded">{"{nome}"}</code>
        <code className="bg-background px-1 rounded">{"{pedido}"}</code>
        <span className="ml-auto">Digite <kbd className="px-1 bg-background rounded">/</kbd> para inserir</span>
      </div>

      {/* Compact message items */}
      <div className="space-y-1">
        {ORDER_STATUSES.map((status) => {
          const message = messages[status.key];
          const isSaving = saving === status.key;
          const isExpanded = expandedItems[status.key];

          return (
            <Collapsible 
              key={status.key} 
              open={isExpanded}
              onOpenChange={() => toggleExpand(status.key)}
            >
              <div className="border rounded-lg bg-card overflow-hidden">
                {/* Header row - always visible */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm">{status.emoji}</span>
                  <span className="text-xs font-medium flex-1">{status.label}</span>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`switch-${status.key}`}
                      checked={message?.ativo ?? false}
                      onCheckedChange={(checked) => updateMessage(status.key, "ativo", checked)}
                      className="scale-75"
                    />
                    <span className={`text-[10px] w-12 ${message?.ativo ? "text-green-600" : "text-muted-foreground"}`}>
                      {message?.ativo ? "Ativo" : "Inativo"}
                    </span>
                    
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                {/* Expandable content */}
                <CollapsibleContent>
                  <div className="px-3 pb-2 pt-0 space-y-2 border-t bg-muted/30">
                    <div className="relative pt-2">
                      <Textarea
                        ref={(el) => { textareaRefs.current[status.key] = el; }}
                        placeholder={`Olá {nome}! Seu pedido #{pedido}...`}
                        value={message?.mensagem ?? ""}
                        onChange={(e) => updateMessage(status.key, "mensagem", e.target.value)}
                        onKeyDown={(e) => handleTextareaKeyDown(e, status.key)}
                        rows={2}
                        className="text-xs resize-none min-h-[60px]"
                      />
                      
                      {/* Variables dropdown */}
                      {showVariables === status.key && (
                        <div className="absolute z-50 mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg overflow-hidden">
                          {VARIABLES.map((variable) => (
                            <button
                              key={variable.key}
                              type="button"
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                              onClick={() => insertVariable(status.key, variable.key)}
                            >
                              <variable.icon className="w-3 h-3 text-muted-foreground" />
                              <span>{variable.label}</span>
                              <code className="ml-auto text-[10px] bg-muted px-1 rounded">{variable.key}</code>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => saveMessage(status.key)}
                      disabled={isSaving}
                      size="sm"
                      className="h-7 text-xs gap-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
