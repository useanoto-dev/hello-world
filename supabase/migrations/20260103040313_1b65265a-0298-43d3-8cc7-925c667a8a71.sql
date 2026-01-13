-- Drop old pizza and acai tables (starting fresh)
DROP TABLE IF EXISTS public.acai_ice_creams CASCADE;
DROP TABLE IF EXISTS public.acai_simple_toppings CASCADE;
DROP TABLE IF EXISTS public.acai_special_toppings CASCADE;
DROP TABLE IF EXISTS public.acai_syrups CASCADE;
DROP TABLE IF EXISTS public.acai_settings CASCADE;
DROP TABLE IF EXISTS public.acai_sizes CASCADE;
DROP TABLE IF EXISTS public.pizza_borders CASCADE;
DROP TABLE IF EXISTS public.pizza_flavors CASCADE;
DROP TABLE IF EXISTS public.pizza_sizes CASCADE;
DROP TABLE IF EXISTS public.pizza_toppings CASCADE;

-- Add new columns to categories table for dynamic configuration
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS use_sequential_flow boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_base_product boolean DEFAULT true;

-- Create option groups table (linked to categories)
CREATE TABLE public.category_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
  is_required boolean DEFAULT false,
  min_selections integer DEFAULT 0,
  max_selections integer DEFAULT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create options table (items within groups)
CREATE TABLE public.category_option_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.category_option_groups(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  additional_price numeric DEFAULT 0,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_option_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for category_option_groups
CREATE POLICY "Anyone can read active option groups"
ON public.category_option_groups FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage option groups"
ON public.category_option_groups FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- RLS policies for category_option_items
CREATE POLICY "Anyone can read active option items"
ON public.category_option_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage option items"
ON public.category_option_items FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Create indexes for performance
CREATE INDEX idx_option_groups_category ON public.category_option_groups(category_id);
CREATE INDEX idx_option_groups_store ON public.category_option_groups(store_id);
CREATE INDEX idx_option_items_group ON public.category_option_items(group_id);
CREATE INDEX idx_option_items_store ON public.category_option_items(store_id);