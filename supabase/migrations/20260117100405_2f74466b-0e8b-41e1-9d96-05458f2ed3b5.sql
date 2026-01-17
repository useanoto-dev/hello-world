-- Add redirect category columns to upsell_modals table
ALTER TABLE public.upsell_modals 
ADD COLUMN IF NOT EXISTS primary_redirect_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS secondary_redirect_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;