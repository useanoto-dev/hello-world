// Edge function: robo_whatsapp_status_pedido
// Sends automatic WhatsApp messages when order status changes
// Uses restaurant's custom messages from mensagens_automaticas_whatsapp table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  pedido_id: string;
  novo_status: string;
}

// Map from database status_pedido to order status
const STATUS_MAP: Record<string, string> = {
  'recebido': 'pending',
  'preparando': 'preparing',
  'pronto': 'ready',
  'entregando': 'delivering',
  'entregue': 'delivered',
};

// Reverse map: order status -> database status_pedido
const REVERSE_STATUS_MAP: Record<string, string> = {
  'pending': 'recebido',
  'preparing': 'preparando',
  'ready': 'pronto',
  'delivering': 'entregando',
  'delivered': 'entregue',
  'completed': 'entregue',
};

// Default fallback messages (used if no custom message is configured)
const DEFAULT_MESSAGES: Record<string, string> = {
  pending: "📥 Olá! Recebemos seu pedido #{pedido}. Em breve começaremos a preparar!",
  preparing: "👨‍🍳 Seu pedido está sendo preparado!",
  ready: "✅ Seu pedido ficou pronto!",
  delivering: "🛵 Seu pedido saiu para entrega!",
  delivered: "🙏 Pedido entregue! Obrigado.",
  completed: "🙏 Pedido entregue! Obrigado.",
};

// Create Supabase client with service role
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Replace message placeholders with actual values
function replacePlaceholders(message: string, orderData: any): string {
  return message
    .replace(/{nome}/g, orderData.customer_name || 'Cliente')
    .replace(/{pedido}/g, String(orderData.order_number || ''));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { pedido_id, novo_status }: RequestPayload = await req.json();

    console.log(`[RoboWhatsApp] ========================================`);
    console.log(`[RoboWhatsApp] Iniciando automação WhatsApp`);
    console.log(`[RoboWhatsApp] Pedido: ${pedido_id}`);
    console.log(`[RoboWhatsApp] Novo status: ${novo_status}`);

    // Validate required fields
    if (!pedido_id || !novo_status) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'pedido_id e novo_status são obrigatórios' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Get order data to find the restaurant and customer info
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('store_id, customer_name, order_number')
      .eq('id', pedido_id)
      .single();

    if (orderError || !orderData) {
      console.log(`[RoboWhatsApp] ✗ Pedido não encontrado: ${pedido_id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Pedido não encontrado' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the database status key
    const dbStatusKey = REVERSE_STATUS_MAP[novo_status];
    if (!dbStatusKey) {
      console.log(`[RoboWhatsApp] ✗ Status não mapeado: "${novo_status}"`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enviado: false,
          motivo: `Status "${novo_status}" não possui mensagem automática` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get custom message from database
    const { data: customMessage, error: messageError } = await supabase
      .from('mensagens_automaticas_whatsapp')
      .select('mensagem, ativo')
      .eq('restaurant_id', orderData.store_id)
      .eq('status_pedido', dbStatusKey)
      .single();

    let message: string | null = null;

    if (customMessage && customMessage.ativo && customMessage.mensagem) {
      // Use custom message from database
      message = replacePlaceholders(customMessage.mensagem, orderData);
      console.log(`[RoboWhatsApp] Usando mensagem personalizada do restaurante`);
    } else if (customMessage && !customMessage.ativo) {
      // Message is disabled for this status
      console.log(`[RoboWhatsApp] ✗ Mensagem desativada para status "${dbStatusKey}"`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enviado: false,
          motivo: `Mensagem automática desativada para status "${dbStatusKey}"` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No custom message, use default
      message = DEFAULT_MESSAGES[novo_status];
      console.log(`[RoboWhatsApp] Usando mensagem padrão (nenhuma personalizada encontrada)`);
    }

    if (!message) {
      console.log(`[RoboWhatsApp] ✗ Nenhuma mensagem disponível para status "${novo_status}"`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enviado: false,
          motivo: `Nenhuma mensagem configurada para status "${novo_status}"` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call enviarMensagemWhatsAppPedido to send the message
    console.log('[RoboWhatsApp] Chamando enviarMensagemWhatsAppPedido...');
    console.log(`[RoboWhatsApp] Mensagem: "${message}"`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const sendResponse = await fetch(`${supabaseUrl}/functions/v1/enviarMensagemWhatsAppPedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey || '',
      },
      body: JSON.stringify({
        pedido_id: pedido_id,
        mensagem: message,
      }),
    });

    const sendResult = await sendResponse.json();
    console.log('[RoboWhatsApp] Resposta:', JSON.stringify(sendResult));

    if (sendResult.success) {
      console.log(`[RoboWhatsApp] ✓ Mensagem enviada com sucesso!`);
    } else {
      console.log(`[RoboWhatsApp] ✗ Falha ao enviar: ${sendResult.error}`);
    }

    // Final result
    const duration = Date.now() - startTime;
    console.log(`[RoboWhatsApp] ========================================`);
    console.log(`[RoboWhatsApp] Concluído em ${duration}ms`);
    console.log(`[RoboWhatsApp] Enviado: ${sendResult.success ? 'SIM' : 'NÃO'}`);

    return new Response(
      JSON.stringify({
        success: true,
        enviado: sendResult.success,
        pedido_id,
        novo_status,
        mensagem_enviada: sendResult.success ? message : null,
        erro: sendResult.success ? null : sendResult.error,
        usou_mensagem_personalizada: !!(customMessage && customMessage.ativo),
        enviarMensagemResponse: sendResult,
        tempo_execucao_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[RoboWhatsApp] Erro fatal:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
