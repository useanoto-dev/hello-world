// Edge function: atualizarStatusPedido
// Central function to update order status and trigger WhatsApp automation
// This is the ONLY way to update order status in the system

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateStatusRequest {
  pedido_id: string;
  novo_status: string;
}

// Call the WhatsApp automation function as a background task
async function triggerWhatsAppAutomation(pedido_id: string, novo_status: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  console.log(`[AtualizarStatus] Triggering WhatsApp automation for order ${pedido_id}`);
  
  try {
    // Call the robo_whatsapp_status_pedido function directly
    const response = await fetch(`${supabaseUrl}/functions/v1/robo_whatsapp_status_pedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ pedido_id, novo_status }),
    });

    const data = await response.json();
    
    if (data.success && data.enviado) {
      console.log(`[AtualizarStatus] WhatsApp message sent successfully to ${data.cliente}`);
    } else if (data.success && !data.enviado) {
      console.log(`[AtualizarStatus] WhatsApp not sent: ${data.motivo}`);
    } else {
      console.error(`[AtualizarStatus] WhatsApp automation failed:`, data.error);
    }
    
    return data;
  } catch (error) {
    console.error('[AtualizarStatus] Error calling WhatsApp automation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Log to historico_whatsapp_pedido table
async function logToHistory(supabase: any, pedido_id: string, telefone: string, mensagem: string, status_pedido: string) {
  try {
    await supabase.from('historico_whatsapp_pedido').insert({
      pedido_id,
      telefone,
      mensagem,
      status_pedido,
      enviado_por: 'sistema',
    });
    console.log('[AtualizarStatus] WhatsApp history logged successfully');
  } catch (error) {
    console.error('[AtualizarStatus] Error logging WhatsApp history:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pedido_id, novo_status }: UpdateStatusRequest = await req.json();

    console.log(`[AtualizarStatus] ========================================`);
    console.log(`[AtualizarStatus] Updating order ${pedido_id} to status: ${novo_status}`);

    // Validate required fields
    if (!pedido_id || !novo_status) {
      return new Response(
        JSON.stringify({ success: false, error: 'pedido_id e novo_status são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get the order details before updating
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, store_id, status')
      .eq('id', pedido_id)
      .single();

    if (orderError || !order) {
      console.error('[AtualizarStatus] Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldStatus = order.status;
    console.log(`[AtualizarStatus] Order #${order.order_number} - ${order.customer_name}`);
    console.log(`[AtualizarStatus] Status change: ${oldStatus} -> ${novo_status}`);

    // 2. Update the order status in the database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: novo_status, updated_at: new Date().toISOString() })
      .eq('id', pedido_id);

    if (updateError) {
      console.error('[AtualizarStatus] Update failed:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AtualizarStatus] ✓ Status updated successfully`);

    // 3. Trigger WhatsApp automation as a background task (non-blocking)
    // This ensures the response is returned immediately while WhatsApp runs in background
    const whatsappPromise = triggerWhatsAppAutomation(pedido_id, novo_status);
    
    // Use EdgeRuntime.waitUntil to ensure the background task completes
    // even after the response is sent
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(whatsappPromise);
      console.log('[AtualizarStatus] WhatsApp automation scheduled as background task');
    } else {
      // Fallback: wait for the WhatsApp call to complete
      await whatsappPromise;
    }

    // 4. Fetch the updated order to return
    const { data: updatedOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', pedido_id)
      .single();

    if (fetchError) {
      console.error('[AtualizarStatus] Error fetching updated order:', fetchError);
    }

    console.log(`[AtualizarStatus] ========================================`);

    return new Response(
      JSON.stringify({
        success: true,
        pedido_id,
        status_anterior: oldStatus,
        novo_status,
        pedido: updatedOrder || null,
        whatsapp: { triggered: true, message: 'WhatsApp automation triggered' },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AtualizarStatus] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
} | undefined;
