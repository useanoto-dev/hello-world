-- Standard Item Sizes (similar to pizza_sizes but for standard items)
CREATE TABLE public.standard_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Standard Items (products within a category - like pizza flavors but for standard items)
CREATE TABLE public.standard_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  item_type TEXT NOT NULL DEFAULT 'tradicional',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Standard Item Prices (price per size - like pizza_flavor_prices)
CREATE TABLE public.standard_item_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.standard_items(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.standard_sizes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, size_id)
);

-- Standard Add-ons (extras like bacon, cheese, etc - like pizza_edges but generic)
CREATE TABLE public.standard_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  max_quantity INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Standard Add-on Prices (price per size)
CREATE TABLE public.standard_addon_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_id UUID NOT NULL REFERENCES public.standard_addons(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.standard_sizes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(addon_id, size_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.standard_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_addon_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for standard_sizes
CREATE POLICY "Anyone can view active standard sizes" 
ON public.standard_sizes FOR SELECT 
USING (is_active = true);

CREATE POLICY "Store owners can manage standard sizes" 
ON public.standard_sizes FOR ALL 
USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies for standard_items
CREATE POLICY "Anyone can view active standard items" 
ON public.standard_items FOR SELECT 
USING (is_active = true);

CREATE POLICY "Store owners can manage standard items" 
ON public.standard_items FOR ALL 
USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies for standard_item_prices
CREATE POLICY "Anyone can view standard item prices" 
ON public.standard_item_prices FOR SELECT 
USING (true);

CREATE POLICY "Store owners can manage standard item prices" 
ON public.standard_item_prices FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.standard_items i 
  WHERE i.id = standard_item_prices.item_id 
  AND is_store_owner(auth.uid(), i.store_id)
));

-- RLS Policies for standard_addons
CREATE POLICY "Anyone can view active standard addons" 
ON public.standard_addons FOR SELECT 
USING (is_active = true);

CREATE POLICY "Store owners can manage standard addons" 
ON public.standard_addons FOR ALL 
USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies for standard_addon_prices
CREATE POLICY "Anyone can view standard addon prices" 
ON public.standard_addon_prices FOR SELECT 
USING (true);

CREATE POLICY "Store owners can manage standard addon prices" 
ON public.standard_addon_prices FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.standard_addons a 
  WHERE a.id = standard_addon_prices.addon_id 
  AND is_store_owner(auth.uid(), a.store_id)
));

-- Create indexes for better performance
CREATE INDEX idx_standard_sizes_category ON public.standard_sizes(category_id);
CREATE INDEX idx_standard_sizes_store ON public.standard_sizes(store_id);
CREATE INDEX idx_standard_items_category ON public.standard_items(category_id);
CREATE INDEX idx_standard_items_store ON public.standard_items(store_id);
CREATE INDEX idx_standard_item_prices_item ON public.standard_item_prices(item_id);
CREATE INDEX idx_standard_item_prices_size ON public.standard_item_prices(size_id);
CREATE INDEX idx_standard_addons_category ON public.standard_addons(category_id);
CREATE INDEX idx_standard_addon_prices_addon ON public.standard_addon_prices(addon_id);