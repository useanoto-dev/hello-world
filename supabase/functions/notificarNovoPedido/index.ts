// Notificar cliente sobre novo pedido via WhatsApp
// Edge function chamada após criação de pedido
// Uses restaurant's custom message from mensagens_automaticas_whatsapp table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  pedido_id: string;
}

// Default message if no custom message is configured
const DEFAULT_MESSAGE = `🍽️ Olá {nome}! Seu pedido #{pedido} foi recebido com sucesso!

Estamos preparando tudo com carinho. Em breve atualizamos você.`;

// Replace message placeholders with actual values
function replacePlaceholders(message: string, orderData: any): string {
  return message
    .replace(/{nome}/g, orderData.customer_name || 'Cliente')
    .replace(/{pedido}/g, String(orderData.order_number || ''));
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pedido_id }: RequestBody = await req.json();

    if (!pedido_id) {
      console.error('[NotificarNovoPedido] pedido_id não fornecido');
      return new Response(
        JSON.stringify({ success: false, error: 'pedido_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[NotificarNovoPedido] Processando pedido:', pedido_id);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, store_id, order_number, customer_name, customer_phone, order_type, total')
      .eq('id', pedido_id)
      .single();

    if (orderError || !order) {
      console.error('[NotificarNovoPedido] Erro ao buscar pedido:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[NotificarNovoPedido] Pedido encontrado:', order.order_number);
    console.log('[NotificarNovoPedido] Telefone do cliente:', order.customer_phone);

    // Get restaurant's WhatsApp token
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('uazapi_instance_token')
      .eq('id', order.store_id)
      .single();

    if (storeError || !store?.uazapi_instance_token) {
      console.error('[NotificarNovoPedido] Restaurante sem token WhatsApp:', storeError);
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp não configurado para este restaurante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get custom message from database
    const { data: customMessage } = await supabase
      .from('mensagens_automaticas_whatsapp')
      .select('mensagem, ativo')
      .eq('restaurant_id', order.store_id)
      .eq('status_pedido', 'recebido')
      .single();

    let message: string;

    if (customMessage && customMessage.ativo && customMessage.mensagem) {
      // Use custom message
      message = replacePlaceholders(customMessage.mensagem, order);
      console.log('[NotificarNovoPedido] Usando mensagem personalizada');
    } else if (customMessage && !customMessage.ativo) {
      // Message disabled - don't send
      console.log('[NotificarNovoPedido] Mensagem de novo pedido desativada');
      return new Response(
        JSON.stringify({ 
          success: true, 
          enviado: false,
          motivo: 'Mensagem automática de novo pedido desativada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Use default message
      message = replacePlaceholders(DEFAULT_MESSAGE, order);
      console.log('[NotificarNovoPedido] Usando mensagem padrão');
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(order.customer_phone);

    // Send WhatsApp message using Uazapi
    const uazapiUrl = 'https://anoto.uazapi.com/send/text';

    const payload = {
      number: formattedPhone,
      text: message,
    };

    console.log('[NotificarNovoPedido] Enviando mensagem para:', formattedPhone);

    const response = await fetch(uazapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': store.uazapi_instance_token,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    console.log('[NotificarNovoPedido] Status HTTP:', response.status);
    console.log('[NotificarNovoPedido] Resposta Uazapi:', JSON.stringify(responseBody));

    // Log to historico_whatsapp_pedido
    const { error: logError } = await supabase
      .from('historico_whatsapp_pedido')
      .insert({
        pedido_id: order.id,
        telefone: formattedPhone,
        mensagem: message,
        status_pedido: 'recebido',
        enviado_por: 'sistema_automatico',
      });

    if (logError) {
      console.warn('[NotificarNovoPedido] Erro ao salvar histórico:', logError);
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        enviado: response.ok,
        message: 'Notificação de novo pedido enviada',
        order_number: order.order_number,
        customer_phone: formattedPhone,
        usou_mensagem_personalizada: !!(customMessage && customMessage.ativo),
        uazapiResponse: responseBody,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[NotificarNovoPedido] Erro:', error);

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
