// WhatsApp Create Instance If Needed
// Creates a Uazapi instance for the restaurant if one doesn't exist

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

    console.log(`[WhatsApp] Creating instance if needed for restaurant: ${restaurantId}`);

    const supabase = getSupabaseClient();
    const uazapiConfig = getUazapiConfig();

    // 1. Fetch the restaurant
    const { data: restaurant, error: fetchError } = await supabase
      .from('stores')
      .select('id, name, uazapi_instance_name, uazapi_instance_token, whatsapp_status')
      .eq('id', restaurantId)
      .single();

    if (fetchError || !restaurant) {
      console.error('[WhatsApp] Restaurant not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. If instance already exists, reuse it (NEVER create a new one)
    if (restaurant.uazapi_instance_name && restaurant.uazapi_instance_token) {
      console.log(`[WhatsApp] Instance already exists, reusing: ${restaurant.uazapi_instance_name}`);
      console.log(`[WhatsApp] Current status: ${restaurant.whatsapp_status} - Will reconnect existing instance`);
      return new Response(
        JSON.stringify({
          success: true,
          created: false,
          message: 'Reusing existing instance',
          data: {
            instance_name: restaurant.uazapi_instance_name,
            instance_token: restaurant.uazapi_instance_token,
            whatsapp_status: restaurant.whatsapp_status,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create instance on Uazapi
    const instanceName = `restaurant-${restaurantId}`;
    console.log(`[WhatsApp] Creating new instance: ${instanceName}`);

    const createResponse = await fetch(`${uazapiConfig.baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': uazapiConfig.adminToken,
      },
      body: JSON.stringify({ name: instanceName }),
    });

    const createResult = await createResponse.json();
    console.log('[WhatsApp] Uazapi create response (full):', JSON.stringify(createResult, null, 2));

    if (!createResponse.ok) {
      console.error('[WhatsApp] Failed to create instance:', createResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: createResult.message || createResult.error || 'Failed to create Uazapi instance',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from response - check multiple possible field names
    const instanceToken = 
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

    console.log(`[WhatsApp] Extracted token: ${instanceToken ? instanceToken.substring(0, 10) + '...' : 'EMPTY'}`);

    // 4. Save to restaurant
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        uazapi_instance_name: instanceName,
        uazapi_instance_token: instanceToken,
        whatsapp_status: 'disconnected',
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('[WhatsApp] Failed to update restaurant:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Instance created but failed to save to database',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WhatsApp] Instance created and saved successfully: ${instanceName}`);

    // 5. Return the data
    return new Response(
      JSON.stringify({
        success: true,
        created: true,
        data: {
          instance_name: instanceName,
          instance_token: instanceToken,
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
