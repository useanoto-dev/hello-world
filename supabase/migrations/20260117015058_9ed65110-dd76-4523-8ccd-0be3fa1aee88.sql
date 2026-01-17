-- Add display_mode and allow_quantity_selector columns to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'cards' CHECK (display_mode IN ('cards', 'list'));

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS allow_quantity_selector BOOLEAN DEFAULT true;

-- Add comments explaining the columns
COMMENT ON COLUMN public.categories.display_mode IS 'How items are displayed in the storefront: cards (grid view) or list (vertical list view)';
COMMENT ON COLUMN public.categories.allow_quantity_selector IS 'Whether to show +/- quantity controls when adding items to cart';