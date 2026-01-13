-- Add promotion scheduling columns to inventory_products
ALTER TABLE public.inventory_products 
ADD COLUMN IF NOT EXISTS promotion_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promotion_end_at TIMESTAMP WITH TIME ZONE;