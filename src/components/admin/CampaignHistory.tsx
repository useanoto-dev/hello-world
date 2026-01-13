import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Megaphone, CheckCircle2, XCircle, Clock, Users, 
  Calendar, MessageSquare, ChevronDown, ChevronUp,
  RefreshCw, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";

interface Campaign {
  id: string;
  name: string;
  message_content: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  is_recurring: boolean;
  recurring_days: number[] | null;
  filters: any;
}

interface CampaignRecipient {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

interface CampaignHistoryProps {
  storeId: string;
}

export function CampaignHistory({ storeId }: CampaignHistoryProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Record<string, CampaignRecipient[]>>({});
  const [loadingRecipients, setLoadingRecipients] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      loadCampaigns();
    }
  }, [storeId]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error) {
      console.error("Error loading campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async (campaignId: string) => {
    if (recipients[campaignId]) {
      return; // Already loaded
    }

    setLoadingRecipients(campaignId);
    try {
      const { data, error } = await supabase
        .from("whatsapp_campaign_recipients")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      setRecipients(prev => ({
        ...prev,
        [campaignId]: (data || []) as CampaignRecipient[]
      }));
    } catch (error) {
      console.error("Error loading recipients:", error);
    } finally {
      setLoadingRecipients(null);
    }
  };

  const toggleExpand = (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
    } else {
      setExpandedCampaign(campaignId);
      loadRecipients(campaignId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Agendado
          </Badge>
        );
      case "sending":
        return (
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Enviando
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">
            <MessageSquare className="w-3 h-3 mr-1" />
            Rascunho
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/20 text-green-700 text-[10px] h-5">Enviado</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-700 text-[10px] h-5">Falhou</Badge>;
      case "pending":
        return <Badge className="bg-gray-500/20 text-gray-700 text-[10px] h-5">Pendente</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] h-5">{status}</Badge>;
    }
  };

  const getSuccessRate = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0;
    return Math.round((campaign.sent_count / campaign.total_recipients) * 100);
  };

  const getDayName = (day: number) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return days[day] || "";
  };

  // Calculate stats
  const stats = {
    total: campaigns.length,
    completed: campaigns.filter(c => c.status === "completed").length,
    scheduled: campaigns.filter(c => c.status === "scheduled").length,
    failed: campaigns.filter(c => c.status === "failed").length,
    totalSent: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
    totalFailed: campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0)
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Megaphone className="w-4 h-4" />
            <span className="text-xs">Total Campanhas</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs">Concluídas</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Agendadas</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Mensagens Enviadas</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalSent}</p>
          {stats.totalFailed > 0 && (
            <p className="text-xs text-red-500">{stats.totalFailed} falharam</p>
          )}
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Histórico de Campanhas</h3>
          <Button variant="ghost" size="sm" onClick={loadCampaigns} className="h-7 gap-1">
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma campanha criada ainda</p>
            <p className="text-xs mt-1">Crie sua primeira campanha na aba Clientes</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {campaigns.map((campaign) => (
                <Collapsible
                  key={campaign.id}
                  open={expandedCampaign === campaign.id}
                  onOpenChange={() => toggleExpand(campaign.id)}
                >
                  <div className="bg-card border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{campaign.name}</span>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(campaign.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {campaign.total_recipients} destinatário(s)
                            </span>
                            {campaign.scheduled_at && campaign.status === "scheduled" && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <Clock className="w-3 h-3" />
                                Agendado: {format(new Date(campaign.scheduled_at), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {campaign.status === "completed" && (
                            <div className="text-right mr-2">
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={getSuccessRate(campaign)} 
                                  className="w-16 h-2"
                                />
                                <span className="text-xs font-medium w-8">
                                  {getSuccessRate(campaign)}%
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {campaign.sent_count} enviados
                                {campaign.failed_count > 0 && ` • ${campaign.failed_count} falhas`}
                              </p>
                            </div>
                          )}
                          {expandedCampaign === campaign.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <AnimatePresence>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="border-t px-4 py-3 space-y-3">
                            {/* Message Preview */}
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
                              <p className="text-sm whitespace-pre-wrap line-clamp-4">
                                {campaign.message_content}
                              </p>
                            </div>

                            {/* Recurring Info */}
                            {campaign.is_recurring && campaign.recurring_days && (
                              <div className="flex items-center gap-2 text-xs text-blue-600">
                                <RefreshCw className="w-3 h-3" />
                                <span>
                                  Recorrente: {campaign.recurring_days.map(getDayName).join(", ")}
                                </span>
                              </div>
                            )}

                            {/* Recipients Table */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Destinatários:</p>
                              
                              {loadingRecipients === campaign.id ? (
                                <div className="space-y-1">
                                  {[1, 2].map(i => (
                                    <Skeleton key={i} className="h-8" />
                                  ))}
                                </div>
                              ) : recipients[campaign.id]?.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  Nenhum destinatário encontrado
                                </p>
                              ) : (
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs h-8">Nome</TableHead>
                                        <TableHead className="text-xs h-8">Telefone</TableHead>
                                        <TableHead className="text-xs h-8">Status</TableHead>
                                        <TableHead className="text-xs h-8">Enviado em</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {recipients[campaign.id]?.slice(0, 10).map((recipient) => (
                                        <TableRow key={recipient.id}>
                                          <TableCell className="text-xs py-2">
                                            {recipient.customer_name}
                                          </TableCell>
                                          <TableCell className="text-xs py-2 font-mono">
                                            {recipient.customer_phone}
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <div className="flex items-center gap-1">
                                              {getRecipientStatusBadge(recipient.status)}
                                              {recipient.error_message && (
                                                <span title={recipient.error_message}>
                                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs py-2 text-muted-foreground">
                                            {recipient.sent_at 
                                              ? format(new Date(recipient.sent_at), "dd/MM HH:mm", { locale: ptBR })
                                              : "-"
                                            }
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {recipients[campaign.id]?.length > 10 && (
                                    <div className="text-center py-2 text-xs text-muted-foreground border-t">
                                      +{recipients[campaign.id].length - 10} mais destinatários
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
