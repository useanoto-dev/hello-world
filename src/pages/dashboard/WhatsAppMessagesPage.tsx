import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Save, Loader2 } from "lucide-react";

interface AutoMessage {
  id?: string;
  restaurant_id: string;
  status_pedido: string;
  mensagem: string;
  ativo: boolean;
}

const ORDER_STATUSES = [
  { key: "preparando", label: "Preparando", description: "Quando o pedido começa a ser preparado", emoji: "👨‍🍳" },
  { key: "pronto", label: "Pronto", description: "Quando o pedido está pronto para retirada/entrega", emoji: "✅" },
  { key: "entregando", label: "Saiu para Entrega", description: "Quando o entregador saiu com o pedido", emoji: "🚗" },
  { key: "entregue", label: "Entregue", description: "Quando o pedido foi entregue ao cliente", emoji: "🎉" },
];

export default function WhatsAppMessagesPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Record<string, AutoMessage>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.store_id) {
      loadMessages();
    }
  }, [profile?.store_id]);

  const loadMessages = async () => {
    if (!profile?.store_id) return;

    try {
      const { data, error } = await supabase
        .from("mensagens_automaticas_whatsapp")
        .select("*")
        .eq("restaurant_id", profile.store_id);

      if (error) throw error;

      const messagesMap: Record<string, AutoMessage> = {};
      
      // Initialize with defaults
      ORDER_STATUSES.forEach((status) => {
        messagesMap[status.key] = {
          restaurant_id: profile.store_id!,
          status_pedido: status.key,
          mensagem: "",
          ativo: false,
        };
      });

      // Override with saved data
      data?.forEach((msg) => {
        messagesMap[msg.status_pedido] = {
          id: msg.id,
          restaurant_id: msg.restaurant_id,
          status_pedido: msg.status_pedido,
          mensagem: msg.mensagem,
          ativo: msg.ativo,
        };
      });

      setMessages(messagesMap);
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

  const saveMessage = async (statusKey: string) => {
    if (!profile?.store_id) return;

    const message = messages[statusKey];
    setSaving(statusKey);

    try {
      if (message.id) {
        // Update existing
        const { error } = await supabase
          .from("mensagens_automaticas_whatsapp")
          .update({
            mensagem: message.mensagem,
            ativo: message.ativo,
          })
          .eq("id", message.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("mensagens_automaticas_whatsapp")
          .insert({
            restaurant_id: profile.store_id,
            status_pedido: statusKey,
            mensagem: message.mensagem,
            ativo: message.ativo,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state with new ID
        setMessages((prev) => ({
          ...prev,
          [statusKey]: {
            ...prev[statusKey],
            id: data.id,
          },
        }));
      }

      toast.success("Mensagem salva com sucesso!");
    } catch (error) {
      console.error("Error saving message:", error);
      toast.error("Erro ao salvar mensagem");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-green-500/10">
          <MessageSquare className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mensagens Automáticas (WhatsApp)</h1>
          <p className="text-muted-foreground">
            Configure mensagens enviadas automaticamente quando o status do pedido mudar
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {ORDER_STATUSES.map((status) => {
          const message = messages[status.key];
          const isSaving = saving === status.key;

          return (
            <Card key={status.key}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{status.emoji}</span>
                    <div>
                      <CardTitle className="text-lg">{status.label}</CardTitle>
                      <CardDescription>{status.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`switch-${status.key}`} className="text-sm text-muted-foreground">
                      {message?.ativo ? "Ativo" : "Inativo"}
                    </Label>
                    <Switch
                      id={`switch-${status.key}`}
                      checked={message?.ativo ?? false}
                      onCheckedChange={(checked) => updateMessage(status.key, "ativo", checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`msg-${status.key}`}>Mensagem</Label>
                  <Textarea
                    id={`msg-${status.key}`}
                    placeholder={`Ex: Olá! Seu pedido está ${status.label.toLowerCase()}. Obrigado pela preferência! 🍕`}
                    value={message?.mensagem ?? ""}
                    onChange={(e) => updateMessage(status.key, "mensagem", e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis disponíveis: {"{nome}"} (nome do cliente), {"{pedido}"} (número do pedido)
                  </p>
                </div>
                <Button
                  onClick={() => saveMessage(status.key)}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
