// WhatsApp Disconnect Instance
// Disconnects (logout) from WhatsApp via Uazapi and clears device info

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Get Uazapi configuration
function getUazapiConfig() {
  const baseUrl = Deno.env.get('UAZAPI_BASE_URL');
  const adminToken = Deno.env.get('UAZAPI_API_KEY');

  if (!baseUrl) throw new Error('UAZAPI_BASE_URL not configured');
  if (!adminToken) throw new Error('UAZAPI_API_KEY not configured');

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    adminToken,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantId } = await req.json();

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'restaurantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WhatsApp] Disconnecting instance for restaurant: ${restaurantId}`);

    const supabase = getSupabaseClient();
    const uazapiConfig = getUazapiConfig();

    // 1. Fetch the restaurant
    const { data: restaurant, error: fetchError } = await supabase
      .from('stores')
      .select('id, uazapi_instance_name, uazapi_instance_token, whatsapp_status')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchError) {
      console.error('[WhatsApp] Database error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if instance exists
    if (!restaurant.uazapi_instance_name) {
      console.log('[WhatsApp] No instance configured, just clearing status');
      
      // Just clear the status
      await supabase
        .from('stores')
        .update({
          whatsapp_status: 'disconnected',
          whatsapp_number: null,
          whatsapp_name: null,
        })
        .eq('id', restaurantId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No instance to disconnect, status cleared',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Make POST /instance/logout to Uazapi
    console.log(`[WhatsApp] Logging out instance: ${restaurant.uazapi_instance_name}`);

    try {
      const logoutResponse = await fetch(`${uazapiConfig.baseUrl}/instance/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': uazapiConfig.adminToken,
        },
        body: JSON.stringify({ name: restaurant.uazapi_instance_name }),
      });

      const logoutResult = await logoutResponse.json();
      console.log('[WhatsApp] Uazapi logout response:', JSON.stringify(logoutResult));

      if (!logoutResponse.ok) {
        console.warn('[WhatsApp] Logout request failed, but continuing to clear status:', logoutResult);
        // Don't throw - we still want to clear the local status even if Uazapi fails
      }
    } catch (logoutError) {
      console.warn('[WhatsApp] Logout request error, but continuing to clear status:', logoutError);
      // Don't throw - we still want to clear the local status even if Uazapi fails
    }

    // 4. Update restaurant - clear device info and set status to disconnected
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        whatsapp_status: 'disconnected',
        whatsapp_number: null,
        whatsapp_name: null,
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('[WhatsApp] Failed to update restaurant:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update restaurant status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[WhatsApp] Instance disconnected and status cleared');

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'WhatsApp disconnected successfully',
        data: {
          instance_name: restaurant.uazapi_instance_name,
          whatsapp_status: 'disconnected',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
