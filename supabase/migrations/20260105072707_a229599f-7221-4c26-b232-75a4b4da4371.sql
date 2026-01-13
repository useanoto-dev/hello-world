-- Add promotion date range columns to category_option_items
ALTER TABLE public.category_option_items
ADD COLUMN promotion_start_at timestamp with time zone DEFAULT NULL,
ADD COLUMN promotion_end_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.category_option_items.promotion_start_at IS 'Start date/time for the promotional price. If NULL and promotional_price is set, promotion is active immediately.';
COMMENT ON COLUMN public.category_option_items.promotion_end_at IS 'End date/time for the promotional price. If NULL, promotion runs indefinitely until manually disabled.';