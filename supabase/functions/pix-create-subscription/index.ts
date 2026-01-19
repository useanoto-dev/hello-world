import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-05-28.basil',
});

// Prices in centavos (BRL)
const PRICES = {
  monthly: 17990, // R$ 179,90
  annual: 171600, // R$ 1.716,00
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, storeId, email } = await req.json();

    if (!plan || !storeId || !email) {
      throw new Error('Plan, storeId and email are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('store_id', storeId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email,
        metadata: { store_id: storeId },
      });
      customerId = customer.id;
    }

    // Get amount based on plan
    const amount = PRICES[plan as keyof typeof PRICES];
    if (!amount) {
      throw new Error('Invalid plan');
    }

    // Create PaymentIntent with PIX (PIX uses PaymentIntent, not Invoice)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      customer: customerId,
      payment_method_types: ['pix'],
      metadata: {
        store_id: storeId,
        plan: plan,
        payment_method: 'pix',
      },
    });

    // Get PIX payment details from next_action
    let pixQrCode = '';
    let pixCode = '';

    // PIX QR code is generated after confirmation, so we need to confirm first
    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id);

    if (confirmedIntent.next_action?.pix_display_qr_code) {
      pixQrCode = confirmedIntent.next_action.pix_display_qr_code.image_url_png || '';
      pixCode = confirmedIntent.next_action.pix_display_qr_code.data || '';
    }

    // Calculate expiration (PIX expires in 24 hours by default)
    const pixExpiresAt = new Date();
    pixExpiresAt.setHours(pixExpiresAt.getHours() + 24);

    // Calculate trial period end (for new subscriptions)
    const currentPeriodEnd = new Date();
    if (plan === 'annual') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    // Update/create subscription in database
    await supabase
      .from('subscriptions')
      .upsert({
        store_id: storeId,
        stripe_customer_id: customerId,
        payment_method: 'pix',
        plan: plan,
        status: 'pending_payment',
        pix_invoice_id: paymentIntent.id, // Store PaymentIntent ID instead of Invoice ID
        pix_qr_code_url: pixQrCode,
        pix_code: pixCode,
        pix_expires_at: pixExpiresAt.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      }, { onConflict: 'store_id' });

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        pixQrCode,
        pixCode,
        expiresAt: pixExpiresAt.toISOString(),
        amount: amount / 100,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PIX subscription error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
