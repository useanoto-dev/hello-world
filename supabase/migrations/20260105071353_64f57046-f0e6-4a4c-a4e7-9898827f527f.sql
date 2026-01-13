-- Add promotional_price to category_option_items for promotions support
ALTER TABLE public.category_option_items 
ADD COLUMN promotional_price numeric NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.category_option_items.promotional_price IS 'When set and lower than additional_price, shows as promotional discount';