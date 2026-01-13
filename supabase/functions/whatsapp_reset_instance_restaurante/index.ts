// WhatsApp Reset Instance - Internal Only
// Resets the WhatsApp instance data in the database without calling Uazapi

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

    console.log(`[WhatsApp Reset] Resetting instance for restaurant: ${restaurantId}`);

    const supabase = getSupabaseClient();

    // 1. Verify the restaurant exists
    const { data: restaurant, error: fetchError } = await supabase
      .from('stores')
      .select('id, uazapi_instance_name, whatsapp_status')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchError) {
      console.error('[WhatsApp Reset] Database error:', fetchError);
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

    const previousInstanceName = restaurant.uazapi_instance_name;

    // 2. Reset the WhatsApp fields - internal database only
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        uazapi_instance_name: null,
        uazapi_instance_token: null,
        whatsapp_status: 'disconnected',
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('[WhatsApp Reset] Failed to reset:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to reset WhatsApp data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WhatsApp Reset] Successfully reset. Previous instance: ${previousInstanceName || 'none'}`);

    // 3. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'WhatsApp instance data reset successfully',
        data: {
          previous_instance_name: previousInstanceName,
          whatsapp_status: 'disconnected',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WhatsApp Reset] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
