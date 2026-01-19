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
  monthly: 'price_1SrOK7E192cWcvpVUTc7JtVz',
  annual: 'price_1SrOKUE192cWcvpVMdTW0yT8',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();

    if (!storeId) {
      throw new Error('Store ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error || !subscription) {
      throw new Error('Subscription not found');
    }

    if (!subscription.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    // Void old invoice if exists
    if (subscription.pix_invoice_id) {
      try {
        await stripe.invoices.voidInvoice(subscription.pix_invoice_id);
      } catch (voidError) {
        console.log('Could not void old invoice:', voidError);
      }
    }

    const priceId = PRICES[subscription.plan as keyof typeof PRICES] || PRICES.monthly;

    // Create new Invoice with PIX
    const invoice = await stripe.invoices.create({
      customer: subscription.stripe_customer_id,
      collection_method: 'send_invoice',
      days_until_due: 1,
      payment_settings: {
        payment_method_types: ['pix'],
      },
      metadata: {
        store_id: storeId,
        plan: subscription.plan,
        payment_method: 'pix',
      },
    });

    // Add line item
    await stripe.invoiceItems.create({
      customer: subscription.stripe_customer_id,
      invoice: invoice.id,
      price: priceId,
      quantity: 1,
    });

    // Finalize to generate PIX
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Get PIX details
    let pixQrCode = '';
    let pixCode = '';

    if (finalizedInvoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        finalizedInvoice.payment_intent as string
      );

      if (paymentIntent.next_action?.pix_display_qr_code) {
        pixQrCode = paymentIntent.next_action.pix_display_qr_code.image_url_png || '';
        pixCode = paymentIntent.next_action.pix_display_qr_code.data || '';
      }
    }

    const pixExpiresAt = new Date();
    pixExpiresAt.setHours(pixExpiresAt.getHours() + 24);

    // Update subscription
    await supabase
      .from('subscriptions')
      .update({
        pix_invoice_id: invoice.id,
        pix_qr_code_url: pixQrCode || finalizedInvoice.hosted_invoice_url,
        pix_code: pixCode,
        pix_expires_at: pixExpiresAt.toISOString(),
      })
      .eq('store_id', storeId);

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        pixQrCode: pixQrCode || finalizedInvoice.hosted_invoice_url,
        pixCode,
        expiresAt: pixExpiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PIX regenerate error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
