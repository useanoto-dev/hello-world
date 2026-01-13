// WhatsApp Connect Instance
// Initiates connection for an existing Uazapi instance

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Create Supabase client with service role
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
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

    console.log(`[WhatsApp] Connecting instance for restaurant: ${restaurantId}`);

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
      console.error('[WhatsApp] Restaurant not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if instance exists and has token
    if (!restaurant.uazapi_instance_name) {
      console.error('[WhatsApp] No instance configured for this restaurant');
      return new Response(
        JSON.stringify({ success: false, error: 'No WhatsApp instance configured. Create one first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant.uazapi_instance_token) {
      console.error('[WhatsApp] No instance token found');
      return new Response(
        JSON.stringify({ success: false, error: 'Instance token not found. Please reset and reconnect.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Try to connect using instance token first
    console.log(`[WhatsApp] Connecting instance: ${restaurant.uazapi_instance_name}`);

    let connectResponse = await fetch(`${uazapiConfig.baseUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': restaurant.uazapi_instance_token,
      },
      body: JSON.stringify({ name: restaurant.uazapi_instance_name }),
    });

    let connectResult = await connectResponse.json();
    console.log('[WhatsApp] Uazapi connect response:', JSON.stringify(connectResult));

    // If token is invalid, try to get a fresh token using admin token via /instance/create
    // (Uazapi returns existing instance with token if it already exists)
    const isInvalidToken = 
      connectResult.code === 401 || 
      connectResult.message?.includes('Invalid token') ||
      connectResult.error?.includes('Invalid token');

    if (isInvalidToken) {
      console.log('[WhatsApp] Token invalid, fetching fresh token via instance/create...');
      
      // Use /instance/create which returns existing instance with token if it already exists
      const createResponse = await fetch(`${uazapiConfig.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': uazapiConfig.adminToken,
        },
        body: JSON.stringify({ name: restaurant.uazapi_instance_name }),
      });

      const createResult = await createResponse.json();
      console.log('[WhatsApp] Create/fetch instance response:', JSON.stringify(createResult));

      // Extract token from response
      const freshToken = 
        createResult.token || 
        createResult.apiToken ||
        createResult.api_token ||
        createResult.instanceToken ||
        createResult.instance_token ||
        createResult.instance?.token ||
        createResult.instance?.apiToken ||
        createResult.data?.token ||
        createResult.data?.apiToken ||
        createResult.data?.instance?.token ||
        '';
      
      if (freshToken) {
        console.log('[WhatsApp] Retrieved fresh token, updating database and retrying connect...');
        
        // Update token in database
        const { error: tokenUpdateError } = await supabase
          .from('stores')
          .update({ uazapi_instance_token: freshToken })
          .eq('id', restaurantId);
        
        if (tokenUpdateError) {
          console.error('[WhatsApp] Failed to save new token:', tokenUpdateError);
        }
        
        // Retry connect with fresh token
        connectResponse = await fetch(`${uazapiConfig.baseUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': freshToken,
          },
          body: JSON.stringify({ name: restaurant.uazapi_instance_name }),
        });
        
        connectResult = await connectResponse.json();
        console.log('[WhatsApp] Retry connect response:', JSON.stringify(connectResult));
      } else {
        console.error('[WhatsApp] Could not extract token from create response');
      }
    }

    // Check if connection is already in progress (this is not an error)
    const isAlreadyConnecting = 
      connectResult.message?.includes('Connection still in progress') ||
      connectResult.error?.includes('Connection still in progress') ||
      connectResult.status === 'connecting' ||
      connectResult.instance?.status === 'connecting';

    if (!connectResponse.ok && !isAlreadyConnecting && !isInvalidToken) {
      console.error('[WhatsApp] Failed to connect instance:', connectResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: connectResult.message || connectResult.error || 'Failed to connect instance',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle case where token refresh also failed
    if (isInvalidToken && !connectResponse.ok) {
      console.error('[WhatsApp] Token refresh failed, connection unsuccessful');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token expired. Please reset the WhatsApp instance and reconnect.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already connecting, that's fine - just continue to update status
    if (isAlreadyConnecting) {
      console.log('[WhatsApp] Connection already in progress, continuing...');
    }

    // 4. Update whatsapp_status to "connecting"
    const { error: updateError } = await supabase
      .from('stores')
      .update({ whatsapp_status: 'connecting' })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('[WhatsApp] Failed to update status:', updateError);
      // Don't fail the request, connection was initiated
    }

    console.log(`[WhatsApp] Instance connection initiated: ${restaurant.uazapi_instance_name}`);

    // 5. Return success with any data from Uazapi (like QR code if provided)
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          instance_name: restaurant.uazapi_instance_name,
          whatsapp_status: 'connecting',
          uazapi_response: connectResult,
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
