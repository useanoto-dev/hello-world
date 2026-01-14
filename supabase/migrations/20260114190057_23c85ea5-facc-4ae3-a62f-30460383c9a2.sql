-- Create product_option_groups table (options linked to products, not categories)
CREATE TABLE public.product_option_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'single', -- 'single' or 'multiple'
  is_required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  item_layout TEXT DEFAULT 'list', -- 'list', 'grid', 'cards'
  show_item_images BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_option_items table (the actual options/flavors)
CREATE TABLE public.product_option_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  additional_price NUMERIC DEFAULT 0,
  promotional_price NUMERIC,
  promotion_start_at TIMESTAMP WITH TIME ZONE,
  promotion_end_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_option_groups
CREATE POLICY "Anyone can view product option groups"
ON public.product_option_groups FOR SELECT
USING (true);

CREATE POLICY "Store owners can manage product option groups"
ON public.product_option_groups FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.store_id = product_option_groups.store_id
  )
);

-- RLS Policies for product_option_items
CREATE POLICY "Anyone can view product option items"
ON public.product_option_items FOR SELECT
USING (true);

CREATE POLICY "Store owners can manage product option items"
ON public.product_option_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.store_id = product_option_items.store_id
  )
);

-- Indexes for performance
CREATE INDEX idx_product_option_groups_product_id ON public.product_option_groups(product_id);
CREATE INDEX idx_product_option_groups_store_id ON public.product_option_groups(store_id);
CREATE INDEX idx_product_option_items_group_id ON public.product_option_items(group_id);
CREATE INDEX idx_product_option_items_store_id ON public.product_option_items(store_id);