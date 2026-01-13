-- Add font_family and secondary_color columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.stores.font_family IS 'Font family for the storefront (e.g., Inter, Poppins, Roboto)';
COMMENT ON COLUMN public.stores.secondary_color IS 'Secondary brand color in HEX format for storefront theming';