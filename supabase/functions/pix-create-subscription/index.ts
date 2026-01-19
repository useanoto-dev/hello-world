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

    // Get price details
    const priceId = PRICES[plan as keyof typeof PRICES];
    if (!priceId) {
      throw new Error('Invalid plan');
    }

    const price = await stripe.prices.retrieve(priceId);

    // Create Invoice with PIX
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 1, // PIX expira em 24h
      payment_settings: {
        payment_method_types: ['pix'],
      },
      metadata: {
        store_id: storeId,
        plan: plan,
        payment_method: 'pix',
      },
    });

    // Add line item with plan price
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      price: priceId,
      quantity: 1,
    });

    // Finalize to generate PIX QR Code
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Get PIX payment details
    let pixQrCode = '';
    let pixCode = '';

    if (finalizedInvoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        finalizedInvoice.payment_intent as string
      );

      // Access next_action for PIX details
      if (paymentIntent.next_action?.pix_display_qr_code) {
        pixQrCode = paymentIntent.next_action.pix_display_qr_code.image_url_png || '';
        pixCode = paymentIntent.next_action.pix_display_qr_code.data || '';
      }
    }

    // Calculate expiration (24 hours from now)
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
        pix_invoice_id: invoice.id,
        pix_qr_code_url: pixQrCode || finalizedInvoice.hosted_invoice_url,
        pix_code: pixCode,
        pix_expires_at: pixExpiresAt.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      }, { onConflict: 'store_id' });

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        pixQrCode: pixQrCode || finalizedInvoice.hosted_invoice_url,
        pixCode,
        expiresAt: pixExpiresAt.toISOString(),
        amount: price.unit_amount ? price.unit_amount / 100 : 0,
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
