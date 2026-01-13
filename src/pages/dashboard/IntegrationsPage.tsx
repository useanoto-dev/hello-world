// Integrations Page - Anotô SaaS
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Plug, MessageCircle, Printer, Loader2, CheckCircle2, XCircle, Phone, User, Unplug, Send, AlertTriangle, MessageSquare } from "lucide-react";
import WhatsAppMessagesTab from "@/components/admin/WhatsAppMessagesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRestaurant } from "@/hooks/useActiveRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const { restaurantId, isLoading: isRestaurantLoading, error: restaurantError } = useActiveRestaurant();
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoadingWhatsApp, setIsLoadingWhatsApp] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<string>("disconnected");
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [whatsappName, setWhatsappName] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to poll status using conectarWhatsAppRestaurante
  const pollStatus = useCallback(async () => {
    if (!restaurantId) return null;

    try {
      console.log('[WhatsApp] Polling via conectarWhatsAppRestaurante...');
      const { data, error } = await supabase.functions.invoke(
        'conectarWhatsAppRestaurante',
        { body: { restaurantId } }
      );

      if (error || !data?.success) {
        console.error('[WhatsApp] Polling error:', error || data?.error);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('[WhatsApp] Polling exception:', error);
      return null;
    }
  }, [restaurantId]);

  // Polling logic - check status every 3 seconds while connecting
  useEffect(() => {
    const startPolling = () => {
      if (pollingIntervalRef.current) return; // Already polling

      console.log('[WhatsApp] Starting polling (3s interval)...');
      pollingIntervalRef.current = setInterval(async () => {
        const data = await pollStatus();
        if (data) {
          const newStatus = data.whatsapp_status || 'disconnected';
          
          // Update QR code if available
          if (data.qrcode) {
            setQrCode(data.qrcode);
          }
          
          // Update device info
          if (data.whatsapp_number) {
            setWhatsappNumber(data.whatsapp_number);
          }
          if (data.whatsapp_name) {
            setWhatsappName(data.whatsapp_name);
          }

          // When connected: stop polling, close screen, show success
          if (newStatus === 'connected') {
            console.log('[WhatsApp] Connected! Stopping polling.');
            setWhatsappStatus('connected');
            setQrCode(null); // Remove QR code
            setIsConnecting(false);
            toast.success('WhatsApp conectado com sucesso!');
            stopPolling();
          } else {
            // Keep as connecting
            setWhatsappStatus(newStatus);
          }
        }
      }, 3000); // Poll every 3 seconds
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        console.log('[WhatsApp] Stopping polling...');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Start polling if status is 'connecting' or isConnecting is true
    if ((whatsappStatus === 'connecting' || isConnecting) && !isDisconnecting) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount
    return () => stopPolling();
  }, [whatsappStatus, isConnecting, pollStatus, isDisconnecting]);

  // Load current WhatsApp state on mount
  useEffect(() => {
    const loadWhatsAppState = async () => {
      if (!restaurantId) return;

      try {
        const { data: store, error } = await supabase
          .from('stores')
          .select('uazapi_instance_name, whatsapp_status, whatsapp_number, whatsapp_name')
          .eq('id', restaurantId)
          .maybeSingle();

        if (error) throw error;

        if (store) {
          setInstanceName((store as any).uazapi_instance_name);
          setWhatsappStatus((store as any).whatsapp_status || 'disconnected');
          setWhatsappNumber((store as any).whatsapp_number || null);
          setWhatsappName((store as any).whatsapp_name || null);
        }
      } catch (error) {
        console.error('[WhatsApp] Error loading state:', error);
      } finally {
        setIsLoadingWhatsApp(false);
      }
    };

    if (restaurantId) {
      loadWhatsAppState();
    }
  }, [restaurantId]);

  const handleConnectWhatsApp = async () => {
    if (!restaurantId) {
      toast.error("Restaurante não encontrado");
      return;
    }

    // Sempre chamar a função, independente do estado atual
    setIsConnecting(true);
    setWhatsappStatus('connecting'); // Força estado connecting para abrir tela
    setQrCode(null);

    try {
      console.log("[WhatsApp] Chamando conectarWhatsAppRestaurante...");
      
      const { data, error } = await supabase.functions.invoke(
        'conectarWhatsAppRestaurante',
        { body: { restaurantId } }
      );

      if (error) throw new Error(error.message || "Erro ao conectar");
      if (!data?.success) throw new Error(data?.error || "Falha ao conectar");

      console.log("[WhatsApp] Resposta:", data);

      // Atualizar estado local
      setInstanceName(data.data?.instance_name || null);
      
      if (data.data?.whatsapp_number) {
        setWhatsappNumber(data.data.whatsapp_number);
      }
      if (data.data?.whatsapp_name) {
        setWhatsappName(data.data.whatsapp_name);
      }

      // Se já conectado, atualizar status e mostrar sucesso
      if (data.data?.whatsapp_status === 'connected') {
        setWhatsappStatus('connected');
        setIsConnecting(false);
        toast.success("WhatsApp conectado!");
        return;
      }

      // Se tem QR Code, exibir
      if (data.data?.qrcode) {
        setQrCode(data.data.qrcode);
      }

      // Manter como connecting - o polling vai continuar buscando
      setWhatsappStatus('connecting');
      // NÃO definir isConnecting = false aqui, para o polling continuar

    } catch (error) {
      console.error("[WhatsApp] Erro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao conectar WhatsApp");
      // Manter tela aberta mesmo em erro - usuário pode tentar novamente
      // NÃO fechar a tela: manter isConnecting e whatsappStatus como connecting
    }
  };

  // Disconnect WhatsApp handler
  const handleDisconnectWhatsApp = async () => {
    if (!profile?.store_id) {
      toast.error("Restaurante não encontrado");
      return;
    }

    setIsDisconnecting(true);

    try {
      console.log("[WhatsApp] Disconnecting...");
      const { data, error } = await supabase.functions.invoke(
        'whatsapp_disconnect_instance',
        { body: { restaurantId: profile.store_id } }
      );

      if (error) throw new Error(error.message || "Erro ao desconectar");
      if (!data?.success) throw new Error(data?.error || "Falha ao desconectar");

      // Clear local state (keep instanceName to allow reconnection)
      setWhatsappStatus('disconnected');
      setWhatsappNumber(null);
      setWhatsappName(null);
      setQrCode(null);
      // Note: Keep instanceName so we can reconnect without creating a new instance

      toast.success("WhatsApp desconectado com sucesso!");

    } catch (error) {
      console.error("[WhatsApp] Disconnect error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao desconectar WhatsApp");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Format: 5511999999999 -> +55 (11) 99999-9999
    if (!number || number.length < 12) return number;
    const countryCode = number.slice(0, 2);
    const areaCode = number.slice(2, 4);
    const part1 = number.slice(4, 9);
    const part2 = number.slice(9);
    return `+${countryCode} (${areaCode}) ${part1}-${part2}`;
  };

  const getStatusBadge = () => {
    switch (whatsappStatus) {
      case 'connected':
        return (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-green-600 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Conectado
            </div>
            {/* Device Info */}
            {(whatsappNumber || whatsappName) && (
              <div className="flex flex-col items-center gap-1 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                {whatsappName && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                    <User className="w-4 h-4" />
                    {whatsappName}
                  </div>
                )}
                {whatsappNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500">
                    <Phone className="w-3.5 h-3.5" />
                    {formatPhoneNumber(whatsappNumber)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 text-yellow-600 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Conectando...
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <XCircle className="w-3.5 h-3.5" />
            Desconectado
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Integrações</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Conecte canais de comunicação e serviços externos
        </p>
      </motion.div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="whatsapp" className="text-xs h-7 gap-1.5 px-3 bg-green-500 text-white hover:bg-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="mensagens" className="text-xs h-7 gap-1.5 px-3 bg-purple-500 text-white hover:bg-purple-600 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <MessageSquare className="w-3.5 h-3.5" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="impressao" className="text-xs h-7 gap-1.5 px-3 bg-gray-300 text-gray-900 hover:bg-gray-400 data-[state=active]:bg-gray-400 data-[state=active]:text-gray-900 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 dark:data-[state=active]:bg-gray-500">
            <Printer className="w-3.5 h-3.5" />
            Impressão
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-4 mt-0">
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4">
              {/* Estado 1: Carregando restaurante */}
              {isRestaurantLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : restaurantError || !restaurantId ? (
                /* Estado 2: Sem restaurante ativo */
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-medium text-sm">Nenhum restaurante selecionado</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Selecione ou crie um restaurante para continuar
                    </p>
                  </div>
                </div>
              ) : isLoadingWhatsApp ? (
                /* Estado 3: Carregando dados do WhatsApp */
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : whatsappStatus === 'connected' ? (
                /* ========== CONNECTED STATE ========== */
                <>
                  {/* WhatsApp Icon */}
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  
                  {/* Badge Conectado */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Conectado
                  </div>

                  {/* Device Info */}
                  <div className="text-center space-y-1">
                    {whatsappName && (
                      <p className="font-semibold text-base">{whatsappName}</p>
                    )}
                    {whatsappNumber && (
                      <p className="text-sm text-muted-foreground">{formatPhoneNumber(whatsappNumber)}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    {/* Test WhatsApp Button - Admin only */}
                    {profile?.is_owner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={isSendingTest}
                        onClick={async () => {
                          setIsSendingTest(true);
                          try {
                            const { data, error } = await supabase.functions.invoke(
                              'testarEnvioWhatsAppAnotoAgora'
                            );

                            if (error) {
                              toast.error(`Erro: ${error.message}`);
                              return;
                            }

                            if (data?.success) {
                              toast.success('Mensagem enviada com sucesso para o WhatsApp');
                            } else {
                              toast.error(`Erro: ${data?.error || JSON.stringify(data?.uazapiResponse) || 'Falha ao enviar mensagem'}`);
                            }
                          } catch (err) {
                            toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
                          } finally {
                            setIsSendingTest(false);
                          }
                        }}
                      >
                        {isSendingTest ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        📲 Enviar mensagem de teste no WhatsApp
                      </Button>
                    )}

                    {/* Disconnect Button with Confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                          disabled={isDisconnecting}
                        >
                          {isDisconnecting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unplug className="w-3.5 h-3.5" />
                          )}
                          {isDisconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá desconectar sua conta do WhatsApp desta integração. 
                            Você poderá reconectar a qualquer momento escaneando um novo QR Code.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDisconnectWhatsApp}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Desconectar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              ) : whatsappStatus === 'connecting' || isConnecting ? (
                /* ========== CONNECTING STATE ========== */
                <>
                  {/* QR Code ou Loader */}
                  {qrCode ? (
                    <div className="p-4 bg-white rounded-lg shadow-sm border">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-64 h-64 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed gap-3">
                      <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Aguardando QR Code...</span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    {qrCode ? (
                      <>
                        <h3 className="font-medium text-sm text-green-600">
                          Escaneie o QR Code com o WhatsApp do restaurante
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Abra o WhatsApp → Menu → Dispositivos conectados → Conectar
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-medium text-sm">
                          Preparando conexão...
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          O QR Code aparecerá em instantes
                        </p>
                      </>
                    )}
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-yellow-600 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {qrCode ? 'Aguardando leitura do QR Code...' : 'Conectando...'}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="gap-2 bg-gray-600 text-white hover:bg-gray-700 hover:text-white border-gray-600"
                      onClick={handleConnectWhatsApp}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {qrCode ? 'Atualizar QR Code' : 'Tentar novamente'}
                    </Button>
                    
                    <Button 
                      variant="ghost"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        // Apenas fecha a tela de conexão, volta para disconnected
                        setWhatsappStatus('disconnected');
                        setQrCode(null);
                        setIsConnecting(false);
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                /* ========== DISCONNECTED STATE ========== */
                <>
                  <svg className="w-12 h-12 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div className="text-center">
                    <h3 className="font-medium text-sm">Integração WhatsApp</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Conecte seu WhatsApp para enviar mensagens automáticas
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-muted-foreground text-xs">
                      <XCircle className="w-3.5 h-3.5" />
                      Desconectado
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {/* Botão principal - Conectar ou Gerar novo QR */}
                    <Button 
                      className={`gap-2 ${instanceName ? "bg-green-400 hover:bg-green-500 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                      onClick={handleConnectWhatsApp}
                      disabled={isConnecting || isRestaurantLoading || !restaurantId}
                    >
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                      {isConnecting ? "Conectando..." : instanceName ? "Gerar novo QR Code" : "Conectar WhatsApp"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mensagens Tab */}
        <TabsContent value="mensagens" className="space-y-4 mt-0">
          <WhatsAppMessagesTab restaurantId={restaurantId} />
        </TabsContent>

        {/* Impressão Tab */}
        <TabsContent value="impressao" className="space-y-4 mt-0">
          <Card>
            <CardContent className="py-12 text-center">
              <Printer className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                Configurações de impressão disponíveis em Configurações → Operação
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PrintNode para impressão automática de comandas
              </p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
