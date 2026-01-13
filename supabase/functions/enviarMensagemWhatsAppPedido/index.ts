// Enviar mensagem WhatsApp para pedido via Uazapi
// Usa o token do restaurante para enviar mensagens

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  pedido_id: string;
  mensagem: string;
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pedido_id, mensagem }: RequestBody = await req.json();

    // Validate required parameters
    if (!pedido_id || !mensagem) {
      console.error('[EnviarMensagemWhatsApp] Parâmetros obrigatórios ausentes');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Parâmetros obrigatórios: pedido_id e mensagem',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[EnviarMensagemWhatsApp] Processando pedido:', pedido_id);

    const supabase = getSupabaseClient();

    // 1. Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_phone, customer_name, store_id, order_number, status')
      .eq('id', pedido_id)
      .maybeSingle();

    if (orderError) {
      console.error('[EnviarMensagemWhatsApp] Erro ao buscar pedido:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order) {
      console.error('[EnviarMensagemWhatsApp] Pedido não encontrado:', pedido_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch restaurant data with WhatsApp token
    const { data: restaurant, error: restaurantError } = await supabase
      .from('stores')
      .select('id, name, uazapi_instance_token, whatsapp_status')
      .eq('id', order.store_id)
      .maybeSingle();

    if (restaurantError) {
      console.error('[EnviarMensagemWhatsApp] Erro ao buscar restaurante:', restaurantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar restaurante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant) {
      console.error('[EnviarMensagemWhatsApp] Restaurante não encontrado:', order.store_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurante não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify restaurant has WhatsApp token
    if (!restaurant.uazapi_instance_token) {
      console.error('[EnviarMensagemWhatsApp] Restaurante sem token WhatsApp:', restaurant.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp não configurado para este restaurante' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Format phone number
    const formattedPhone = formatPhoneNumber(order.customer_phone);
    console.log('[EnviarMensagemWhatsApp] Enviando para:', formattedPhone);
    console.log('[EnviarMensagemWhatsApp] Mensagem:', mensagem.substring(0, 100) + '...');

    // 5. Send message via Uazapi
    const uazapiUrl = 'https://anoto.uazapi.com/send/text';

    const payload = {
      number: formattedPhone,
      text: mensagem,
    };

    const response = await fetch(uazapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': restaurant.uazapi_instance_token,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    console.log('[EnviarMensagemWhatsApp] Status HTTP:', response.status);
    console.log('[EnviarMensagemWhatsApp] Resposta Uazapi:', JSON.stringify(responseBody));

    // 6. Log message in history
    if (response.ok) {
      await supabase
        .from('historico_whatsapp_pedido')
        .insert({
          pedido_id: pedido_id,
          telefone: formattedPhone,
          mensagem: mensagem,
          status_pedido: order.status || 'unknown',
          enviado_por: 'sistema',
        });
    }

    // 7. Return response
    return new Response(
      JSON.stringify({
        success: response.ok,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        uazapiResponse: responseBody,
        order: {
          id: order.id,
          order_number: order.order_number,
          customer_phone: formattedPhone,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[EnviarMensagemWhatsApp] Erro:', error);

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
