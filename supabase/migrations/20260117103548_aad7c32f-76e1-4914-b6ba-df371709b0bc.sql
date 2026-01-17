-- Add modal_content_type to differentiate edge-integrated modals from product-based modals
ALTER TABLE public.upsell_modals 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'products';

-- content_type can be:
-- 'products' = shows products from target_category_id (default behavior)
-- 'pizza_edges' = shows pizza edges from pizza_edges table for the trigger category
-- 'pizza_doughs' = shows pizza doughs from pizza_doughs table for the trigger category

COMMENT ON COLUMN public.upsell_modals.content_type IS 'Type of content to show: products, pizza_edges, pizza_doughs';