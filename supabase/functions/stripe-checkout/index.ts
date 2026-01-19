import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-05-28.basil',
});

// Price IDs - produção
const PRICES = {
  monthly: 'price_1SrOK7E192cWcvpVUTc7JtVz', // R$ 179,90/mês
  annual: 'price_1SrOKUE192cWcvpVMdTW0yT8',  // R$ 1.716/ano
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, plan, storeId, email, successUrl, cancelUrl } = await req.json();

    if (!priceId && !plan) {
      throw new Error('Price ID or plan is required');
    }

    if (!storeId) {
      throw new Error('Store ID is required');
    }

    const selectedPriceId = priceId || PRICES[plan as keyof typeof PRICES];

    if (!selectedPriceId) {
      throw new Error('Invalid plan selected');
    }

    // Create Supabase client to fetch/create Stripe customer
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

    if (!customerId && email) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email,
        metadata: { store_id: storeId },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('store_id', storeId);
    }

    // Create Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card', 'boleto'],
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/dashboard/subscription?canceled=true`,
      metadata: {
        store_id: storeId,
      },
      subscription_data: {
        metadata: {
          store_id: storeId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stripe checkout error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
