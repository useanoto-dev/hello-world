-- Add option to show/hide flavor prices in pizza categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS show_flavor_prices boolean NOT NULL DEFAULT true;