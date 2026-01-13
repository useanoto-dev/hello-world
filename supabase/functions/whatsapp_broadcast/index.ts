// Edge Function para Disparo de Mensagens WhatsApp em Massa
// Implementa boas práticas anti-bloqueio do WhatsApp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaign_id: string;
}

// ==========================================
// CONFIGURAÇÕES ANTI-BLOQUEIO WHATSAPP
// ==========================================

const ANTI_BLOCK_CONFIG = {
  // Delay mínimo e máximo entre mensagens (em ms) - reduzido para testes
  MIN_DELAY: 1500,      // 1.5 segundos mínimo
  MAX_DELAY: 3000,      // 3 segundos máximo
  
  // Pausa longa a cada X mensagens (simula comportamento humano)
  BATCH_SIZE: 10,       // A cada 10 mensagens
  BATCH_PAUSE_MIN: 5000,  // Pausa de 5s a 15s (reduzido para agilidade)
  BATCH_PAUSE_MAX: 15000,
  
  // Limite de mensagens por execução (evitar timeout e bloqueio)
  MAX_MESSAGES_PER_RUN: 50,
  
  // Variações de texto para parecer mais humano
  GREETING_VARIATIONS: ['Olá', 'Oi', 'E aí', 'Eai', 'Hey'],
  EMOJI_VARIATIONS: ['😊', '🙂', '👋', '✨', '💛', '🎉'],
};

// Create Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // Add Brazil country code if not present
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

// ==========================================
// FUNÇÕES ANTI-BLOQUEIO
// ==========================================

// Gera delay aleatório entre min e max (comportamento humano)
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep helper com delay aleatório
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Adiciona pequenas variações ao texto para evitar detecção de spam
function addTextVariations(message: string): string {
  // Adiciona espaço invisível aleatório (zero-width space)
  const zwsp = '\u200B';
  
  // Inserir caractere invisível em posição aleatória (anti-detecção de duplicatas)
  const position = Math.floor(Math.random() * message.length);
  const variedMessage = message.slice(0, position) + zwsp + message.slice(position);
  
  return variedMessage;
}

// Personaliza saudação de forma natural
function personalizeGreeting(message: string, name: string): string {
  let personalizedMessage = message;
  
  // Substituir {nome} com variações naturais
  const firstName = name.split(' ')[0];
  const greetingVariations = [
    firstName,
    firstName + '!',
    firstName + ' 😊',
    firstName + ', tudo bem?',
  ];
  
  const randomGreeting = greetingVariations[Math.floor(Math.random() * greetingVariations.length)];
  personalizedMessage = personalizedMessage.replace(/{nome}/gi, randomGreeting);
  
  return personalizedMessage;
}

// Verifica horário comercial (evitar envios em horários suspeitos)
function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getUTCHours() - 3; // Ajuste para horário de Brasília
  
  // Horário comercial: 8h às 21h
  return hour >= 8 && hour <= 21;
}

// Log com timestamp para debug
function logWithTime(message: string) {
  const now = new Date().toISOString();
  console.log(`[${now}] ${message}`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id }: RequestBody = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'campaign_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logWithTime(`[WhatsAppBroadcast] Iniciando campanha: ${campaign_id}`);

    // Verificar horário comercial (boas práticas anti-bloqueio)
    if (!isBusinessHours()) {
      logWithTime('[WhatsAppBroadcast] AVISO: Enviando fora do horário comercial - maior risco de bloqueio');
    }

    const supabase = getSupabaseClient();

    // 1. Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_campaigns')
      .select('*, store:stores(id, name, uazapi_instance_token, whatsapp_status)')
      .eq('id', campaign_id)
      .maybeSingle();

    if (campaignError) {
      console.error('[WhatsAppBroadcast] Erro ao buscar campanha:', campaignError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar campanha' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campanha não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check WhatsApp configuration
    const store = campaign.store as any;
    if (!store?.uazapi_instance_token) {
      // Mark ALL recipients as failed
      await supabase
        .from('whatsapp_campaign_recipients')
        .update({ 
          status: 'failed',
          error_message: 'WhatsApp não configurado'
        })
        .eq('campaign_id', campaign_id)
        .eq('status', 'pending');
        
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaign_id);

      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp não configurado para esta loja' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check WhatsApp connection status
    if (store.whatsapp_status !== 'connected') {
      // Mark ALL recipients as failed
      await supabase
        .from('whatsapp_campaign_recipients')
        .update({ 
          status: 'failed',
          error_message: 'WhatsApp desconectado'
        })
        .eq('campaign_id', campaign_id)
        .eq('status', 'pending');
        
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaign_id);

      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp não está conectado. Conecte-o em Integrações.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch pending recipients (limitado para anti-bloqueio)
    const { data: recipients, error: recipientsError } = await supabase
      .from('whatsapp_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending')
      .order('created_at')
      .limit(ANTI_BLOCK_CONFIG.MAX_MESSAGES_PER_RUN); // Limitar por execução

    if (recipientsError) {
      console.error('[WhatsAppBroadcast] Erro ao buscar destinatários:', recipientsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar destinatários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipients || recipients.length === 0) {
      logWithTime('[WhatsAppBroadcast] Nenhum destinatário pendente');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum destinatário pendente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logWithTime(`[WhatsAppBroadcast] Enviando para ${recipients.length} destinatários (máx: ${ANTI_BLOCK_CONFIG.MAX_MESSAGES_PER_RUN})`);

    const uazapiTextUrl = 'https://anoto.uazapi.com/send/text';
    let sentCount = 0;
    let failedCount = 0;

    // 3. Send messages with anti-blocking measures
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Personalizar mensagem com variações (anti-spam)
        let personalizedMessage = personalizeGreeting(campaign.message_content, recipient.customer_name);
        
        // Adicionar variação invisível (anti-detecção de duplicatas)
        personalizedMessage = addTextVariations(personalizedMessage);
        
        const formattedPhone = formatPhoneNumber(recipient.customer_phone);

        logWithTime(`[WhatsAppBroadcast] [${i + 1}/${recipients.length}] Enviando para ${formattedPhone}`);

        const response = await fetch(uazapiTextUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': store.uazapi_instance_token,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: personalizedMessage,
          }),
        });

        const responseBody = await response.json();
        logWithTime(`[WhatsAppBroadcast] Resposta UAZAPI: ${response.status}`);

        if (response.ok) {
          // Update recipient status to sent
          await supabase
            .from('whatsapp_campaign_recipients')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', recipient.id);

          sentCount++;
        } else {
          // Update recipient status to failed
          await supabase
            .from('whatsapp_campaign_recipients')
            .update({ 
              status: 'failed',
              error_message: responseBody.message || 'Erro desconhecido'
            })
            .eq('id', recipient.id);

          failedCount++;
        }

      } catch (error: any) {
        console.error(`[WhatsAppBroadcast] Erro ao enviar para ${recipient.customer_phone}:`, error);
        
        await supabase
          .from('whatsapp_campaign_recipients')
          .update({ 
            status: 'failed',
            error_message: error.message || 'Erro de conexão'
          })
          .eq('id', recipient.id);

        failedCount++;
      }

      // ==========================================
      // DELAYS ANTI-BLOQUEIO
      // ==========================================
      
      // Delay aleatório entre mensagens (3-8 segundos)
      const messageDelay = getRandomDelay(
        ANTI_BLOCK_CONFIG.MIN_DELAY, 
        ANTI_BLOCK_CONFIG.MAX_DELAY
      );
      logWithTime(`[WhatsAppBroadcast] Aguardando ${messageDelay}ms antes da próxima mensagem...`);
      await sleep(messageDelay);
      
      // Pausa longa a cada BATCH_SIZE mensagens (simula comportamento humano)
      if ((i + 1) % ANTI_BLOCK_CONFIG.BATCH_SIZE === 0 && i < recipients.length - 1) {
        const batchPause = getRandomDelay(
          ANTI_BLOCK_CONFIG.BATCH_PAUSE_MIN,
          ANTI_BLOCK_CONFIG.BATCH_PAUSE_MAX
        );
        logWithTime(`[WhatsAppBroadcast] Pausa de lote: ${Math.round(batchPause / 1000)}s (anti-bloqueio)`);
        await sleep(batchPause);
      }
    }

    // 4. Update campaign statistics
    const remainingRecipients = await supabase
      .from('whatsapp_campaign_recipients')
      .select('id', { count: 'exact' })
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');
    
    const hasMoreToSend = (remainingRecipients.count || 0) > 0;
    const finalStatus = hasMoreToSend ? 'sending' : (failedCount === recipients.length ? 'failed' : 'completed');
    
    await supabase
      .from('whatsapp_campaigns')
      .update({
        status: finalStatus,
        sent_count: (campaign.sent_count || 0) + sentCount,
        failed_count: (campaign.failed_count || 0) + failedCount,
        ...(finalStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
      })
      .eq('id', campaign_id);

    logWithTime(`[WhatsAppBroadcast] Lote concluído: ${sentCount} enviadas, ${failedCount} falhas, ${remainingRecipients.count || 0} restantes`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        sent: sentCount,
        failed: failedCount,
        total: recipients.length,
        remaining: remainingRecipients.count || 0,
        status: finalStatus,
        message: hasMoreToSend 
          ? `Lote enviado. Restam ${remainingRecipients.count} destinatários. Execute novamente para continuar.`
          : 'Campanha concluída!'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[WhatsAppBroadcast] Erro:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
