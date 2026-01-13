-- Add sidebar/menu color customization field to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS sidebar_color TEXT DEFAULT 'amber';

-- Add comment explaining the field
COMMENT ON COLUMN public.stores.sidebar_color IS 'Menu sidebar color theme: amber (default), purple (açaí), red (hamburgueria), orange (pizzaria), green (saladas), blue (frutos-mar), custom hex color';