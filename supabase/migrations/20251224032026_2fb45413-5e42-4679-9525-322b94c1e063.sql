-- Add price_label column to pizza_sizes table
ALTER TABLE public.pizza_sizes 
ADD COLUMN IF NOT EXISTS price_label text DEFAULT 'A partir de';