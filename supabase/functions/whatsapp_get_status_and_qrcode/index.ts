// WhatsApp Get Status and QR Code
// Gets the current status and QR code from Uazapi instance

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

// Get Uazapi base URL
function getUazapiBaseUrl() {
  const baseUrl = Deno.env.get('UAZAPI_BASE_URL');
  if (!baseUrl) throw new Error('UAZAPI_BASE_URL not configured');
  return baseUrl.replace(/\/$/, '');
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

    console.log(`[WhatsApp] Getting status for restaurant: ${restaurantId}`);

    const supabase = getSupabaseClient();
    const baseUrl = getUazapiBaseUrl();

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
    if (!restaurant.uazapi_instance_name || !restaurant.uazapi_instance_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No WhatsApp instance configured',
          whatsapp_status: 'not_configured',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Make GET /instance/status with instance token
    console.log(`[WhatsApp] Fetching status for instance: ${restaurant.uazapi_instance_name}`);

    const statusResponse = await fetch(`${baseUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'token': restaurant.uazapi_instance_token,
      },
    });

    const statusResult = await statusResponse.json();
    console.log('[WhatsApp] Uazapi status response:', JSON.stringify(statusResult));

    if (!statusResponse.ok) {
      console.error('[WhatsApp] Failed to get status:', statusResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: statusResult.message || statusResult.error || 'Failed to get instance status',
          whatsapp_status: restaurant.whatsapp_status,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Extract status, qrcode, and device info from response
    const instanceData = statusResult.instance || statusResult.data || statusResult;
    const statusData = statusResult.status || {};
    
    const instanceStatus = instanceData.status || statusData.status || 'unknown';
    const qrcode = instanceData.qrcode || statusResult.qrcode || null;
    
    // Extract device info when connected
    const jid = statusData.jid || instanceData.jid || instanceData.owner || null;
    const profileName = instanceData.profileName || instanceData.pushName || instanceData.name || null;
    
    // Extract WhatsApp number from jid (format: 5511999999999@s.whatsapp.net)
    let whatsappNumber = null;
    if (jid && typeof jid === 'string') {
      whatsappNumber = jid.split('@')[0];
    }
    
    console.log(`[WhatsApp] Device info - JID: ${jid}, ProfileName: ${profileName}, Number: ${whatsappNumber}`);

    // Map Uazapi status to our status
    // Check both instance status and connection status
    const isConnected = instanceStatus === 'connected' || 
                        instanceStatus === 'open' || 
                        (statusData.connected === true && statusData.loggedIn === true);
    
    let whatsappStatus = 'disconnected';
    if (isConnected) {
      whatsappStatus = 'connected';
    } else if (instanceStatus === 'connecting' || instanceStatus === 'qrcode' || qrcode || statusData.connected === true) {
      whatsappStatus = 'connecting';
    } else if (instanceStatus === 'disconnected' || instanceStatus === 'close') {
      whatsappStatus = 'disconnected';
    }

    // 5. Update restaurant with status and device info
    const updateData: Record<string, unknown> = {};
    
    // Always update status if changed
    if (whatsappStatus !== restaurant.whatsapp_status) {
      updateData.whatsapp_status = whatsappStatus;
    }
    
    // When connected, also save device info
    if (whatsappStatus === 'connected') {
      if (whatsappNumber) {
        updateData.whatsapp_number = whatsappNumber;
      }
      if (profileName) {
        updateData.whatsapp_name = profileName;
      }
    }
    
    // Only update if there's something to update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', restaurantId);

      if (updateError) {
        console.error('[WhatsApp] Failed to update restaurant:', updateError);
      } else {
        console.log(`[WhatsApp] Restaurant updated:`, updateData);
      }
    }

    // 6. Return status, qrcode, and device info
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          whatsapp_status: whatsappStatus,
          qrcode: qrcode,
          instance_name: restaurant.uazapi_instance_name,
          raw_status: instanceStatus,
          // Device info (when connected)
          whatsapp_number: whatsappNumber,
          whatsapp_name: profileName,
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
