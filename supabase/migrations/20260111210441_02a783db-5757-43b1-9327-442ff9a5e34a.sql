-- Add scheduling columns to whatsapp_campaigns
ALTER TABLE public.whatsapp_campaigns
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_days INTEGER[] DEFAULT NULL;