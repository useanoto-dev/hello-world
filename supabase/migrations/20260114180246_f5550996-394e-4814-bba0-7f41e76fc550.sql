-- Add display_mode column to products table
ALTER TABLE public.products 
ADD COLUMN display_mode TEXT DEFAULT 'direct' CHECK (display_mode IN ('direct', 'customization'));

-- Add comment explaining the column
COMMENT ON COLUMN public.products.display_mode IS 'How the product is displayed: direct (adds to cart immediately) or customization (opens customization screen)';