-- Add button customization columns to upsell_modals
ALTER TABLE public.upsell_modals 
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Escolher',
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS secondary_button_text TEXT DEFAULT 'Sem, obrigado',
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🥤';