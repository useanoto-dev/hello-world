import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-05-28.basil',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', err);
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const storeId = session.metadata?.store_id;
        
        if (storeId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await supabase
            .from('subscriptions')
            .upsert({
              store_id: storeId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
              plan: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            }, { onConflict: 'store_id' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const storeId = subscription.metadata?.store_id;

        if (storeId) {
          // Mapear status do Stripe para o sistema
          let mappedStatus = 'expired';
          if (subscription.status === 'active') {
            mappedStatus = 'active';
          } else if (subscription.status === 'past_due') {
            // Verificar se está em atraso por mais de 3 dias
            const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            const now = new Date();
            const daysPastDue = Math.floor((now.getTime() - currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysPastDue >= 3) {
              mappedStatus = 'expired'; // Bloquear acesso após 3 dias de atraso
            } else {
              mappedStatus = 'past_due'; // Ainda tem tolerância
            }
          } else if (subscription.status === 'canceled') {
            mappedStatus = 'canceled';
          }

          await supabase
            .from('subscriptions')
            .update({
              status: mappedStatus,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('store_id', storeId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const storeId = subscription.metadata?.store_id;

        if (storeId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('store_id', storeId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const storeId = paymentIntent.metadata?.store_id;
        const plan = paymentIntent.metadata?.plan;
        const isPix = paymentIntent.metadata?.payment_method === 'pix';

        if (isPix && storeId) {
          // PIX credit payment - add 30 days for monthly or 365 days for annual
          const newPeriodEnd = new Date();
          if (plan === 'annual') {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
            newPeriodEnd.setDate(newPeriodEnd.getDate() + 3); // +3 days tolerance
          } else {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
            newPeriodEnd.setDate(newPeriodEnd.getDate() + 3); // +3 days tolerance
          }

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: newPeriodEnd.toISOString(),
              pix_invoice_id: null,
              pix_qr_code_url: null,
              pix_code: null,
              pix_expires_at: null,
            })
            .eq('store_id', storeId);

          console.log(`PIX credit payment confirmed for store ${storeId}, plan: ${plan}, expires: ${newPeriodEnd.toISOString()}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const invoiceMetadata = invoice.metadata;
        
        // Check if this is a PIX payment (via invoice metadata)
        const isPix = invoiceMetadata?.payment_method === 'pix';
        const storeIdFromInvoice = invoiceMetadata?.store_id;
        const planFromInvoice = invoiceMetadata?.plan;
        
        if (isPix && storeIdFromInvoice) {
          // PIX payment - manual invoice, no Stripe subscription
          const newPeriodEnd = new Date();
          if (planFromInvoice === 'annual') {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
            newPeriodEnd.setDate(newPeriodEnd.getDate() + 3); // +3 days tolerance
          } else {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
            newPeriodEnd.setDate(newPeriodEnd.getDate() + 3); // +3 days tolerance
          }

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: newPeriodEnd.toISOString(),
              pix_invoice_id: null,
              pix_qr_code_url: null,
              pix_code: null,
              pix_expires_at: null,
            })
            .eq('store_id', storeIdFromInvoice);

          console.log(`PIX payment confirmed for store ${storeIdFromInvoice}`);
        } else if (subscriptionId) {
          // Regular card/boleto subscription payment
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const storeId = subscription.metadata?.store_id;
          
          if (storeId) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('store_id', storeId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const storeId = subscription.metadata?.store_id;
          
          if (storeId) {
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('store_id', storeId);
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500 }
    );
  }
});
