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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find PIX subscriptions expiring in the next 5 days
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_method', 'pix')
      .eq('status', 'active')
      .lte('current_period_end', fiveDaysFromNow.toISOString())
      .is('pix_invoice_id', null); // Don't generate if invoice already exists

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`Found ${subscriptions?.length || 0} PIX subscriptions to renew`);

    const results = [];

    for (const sub of subscriptions || []) {
      try {
        if (!sub.stripe_customer_id) {
          console.log(`Skipping subscription for store ${sub.store_id} - no customer ID`);
          continue;
        }

        const priceId = PRICES[sub.plan as keyof typeof PRICES] || PRICES.monthly;

        // Create new Invoice with PIX
        const invoice = await stripe.invoices.create({
          customer: sub.stripe_customer_id,
          collection_method: 'send_invoice',
          days_until_due: 3,
          payment_settings: {
            payment_method_types: ['pix'],
          },
          metadata: {
            store_id: sub.store_id,
            plan: sub.plan,
            payment_method: 'pix',
            renewal: 'true',
          },
        });

        // Add line item
        await stripe.invoiceItems.create({
          customer: sub.stripe_customer_id,
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
        pixExpiresAt.setHours(pixExpiresAt.getHours() + 72); // 3 days to pay

        // Update subscription
        await supabase
          .from('subscriptions')
          .update({
            pix_invoice_id: invoice.id,
            pix_qr_code_url: pixQrCode || finalizedInvoice.hosted_invoice_url,
            pix_code: pixCode,
            pix_expires_at: pixExpiresAt.toISOString(),
          })
          .eq('store_id', sub.store_id);

        results.push({
          store_id: sub.store_id,
          invoice_id: invoice.id,
          status: 'success',
        });

        console.log(`Generated PIX invoice for store ${sub.store_id}: ${invoice.id}`);
      } catch (subError) {
        console.error(`Error processing subscription for store ${sub.store_id}:`, subError);
        results.push({
          store_id: sub.store_id,
          status: 'error',
          error: subError instanceof Error ? subError.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PIX invoice generator error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
