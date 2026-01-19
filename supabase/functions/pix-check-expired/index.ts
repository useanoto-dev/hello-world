import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find PIX subscriptions that are past due by 3+ days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 1. Block subscriptions expired for 3+ days
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from('subscriptions')
      .select('store_id, status, current_period_end')
      .eq('payment_method', 'pix')
      .in('status', ['active', 'past_due', 'pending_payment'])
      .lt('current_period_end', threeDaysAgo.toISOString());

    if (expiredError) {
      throw new Error(`Database error: ${expiredError.message}`);
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} expired PIX subscriptions`);

    const blockedStores = [];

    for (const sub of expiredSubscriptions || []) {
      await supabase
        .from('subscriptions')
        .update({ 
          status: 'expired',
          pix_invoice_id: null,
          pix_qr_code_url: null,
          pix_code: null,
          pix_expires_at: null,
        })
        .eq('store_id', sub.store_id);

      blockedStores.push(sub.store_id);
      console.log(`Blocked store ${sub.store_id} - PIX subscription expired`);
    }

    // 2. Mark as past_due subscriptions that are 1-3 days overdue
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: pastDueSubscriptions, error: pastDueError } = await supabase
      .from('subscriptions')
      .select('store_id')
      .eq('payment_method', 'pix')
      .eq('status', 'active')
      .lt('current_period_end', oneDayAgo.toISOString())
      .gte('current_period_end', threeDaysAgo.toISOString());

    if (pastDueError) {
      throw new Error(`Database error: ${pastDueError.message}`);
    }

    const pastDueStores = [];

    for (const sub of pastDueSubscriptions || []) {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('store_id', sub.store_id);

      pastDueStores.push(sub.store_id);
      console.log(`Marked store ${sub.store_id} as past_due`);
    }

    // 3. Clear expired PIX QR codes (older than 24h but not yet past_due)
    const { error: clearError } = await supabase
      .from('subscriptions')
      .update({
        pix_invoice_id: null,
        pix_qr_code_url: null,
        pix_code: null,
        pix_expires_at: null,
      })
      .eq('payment_method', 'pix')
      .lt('pix_expires_at', new Date().toISOString())
      .not('pix_expires_at', 'is', null);

    if (clearError) {
      console.error('Error clearing expired PIX codes:', clearError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocked: blockedStores.length,
        blockedStores,
        pastDue: pastDueStores.length,
        pastDueStores,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PIX check expired error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
