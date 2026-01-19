-- Add missing columns to subscriptions table for Stripe integration
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;