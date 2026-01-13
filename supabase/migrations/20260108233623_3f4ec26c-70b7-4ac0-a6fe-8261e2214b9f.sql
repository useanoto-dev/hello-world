-- =============================================
-- FUNÇÃO PARA UPDATED_AT (se não existir)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- PIZZA SIZES TABLE
-- =============================================
CREATE TABLE public.pizza_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slices INTEGER NOT NULL DEFAULT 8,
  max_flavors INTEGER NOT NULL DEFAULT 1,
  min_flavors INTEGER NOT NULL DEFAULT 1,
  price_model TEXT NOT NULL DEFAULT 'highest',
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pizza_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pizza sizes"
ON public.pizza_sizes FOR SELECT
USING (is_active = true);

CREATE POLICY "Store owners can manage pizza sizes"
ON public.pizza_sizes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.store_id = pizza_sizes.store_id
  )
);

CREATE INDEX idx_pizza_sizes_category ON public.pizza_sizes(category_id);
CREATE INDEX idx_pizza_sizes_store ON public.pizza_sizes(store_id);

-- =============================================
-- PIZZA FLAVORS TABLE
-- =============================================
CREATE TABLE public.pizza_flavors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  flavor_type TEXT NOT NULL DEFAULT 'salgada',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pizza_flavors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pizza flavors"
ON public.pizza_flavors FOR SELECT
USING (is_active = true);

CREATE POLICY "Store owners can manage pizza flavors"
ON public.pizza_flavors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.store_id = pizza_flavors.store_id
  )
);

CREATE INDEX idx_pizza_flavors_category ON public.pizza_flavors(category_id);
CREATE INDEX idx_pizza_flavors_store ON public.pizza_flavors(store_id);
CREATE INDEX idx_pizza_flavors_type ON public.pizza_flavors(flavor_type);

-- =============================================
-- PIZZA FLAVOR PRICES TABLE
-- =============================================
CREATE TABLE public.pizza_flavor_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flavor_id UUID NOT NULL REFERENCES public.pizza_flavors(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  surcharge NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flavor_id, size_id)
);

ALTER TABLE public.pizza_flavor_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pizza flavor prices"
ON public.pizza_flavor_prices FOR SELECT
USING (true);

CREATE POLICY "Store owners can manage pizza flavor prices"
ON public.pizza_flavor_prices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pizza_flavors pf
    JOIN public.profiles p ON p.store_id = pf.store_id
    WHERE pf.id = pizza_flavor_prices.flavor_id
    AND p.id = auth.uid()
  )
);

CREATE INDEX idx_pizza_flavor_prices_flavor ON public.pizza_flavor_prices(flavor_id);
CREATE INDEX idx_pizza_flavor_prices_size ON public.pizza_flavor_prices(size_id);

-- =============================================
-- PIZZA EDGES TABLE
-- =============================================
CREATE TABLE public.pizza_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pizza_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pizza edges"
ON public.pizza_edges FOR SELECT
USING (is_active = true);

CREATE POLICY "Store owners can manage pizza edges"
ON public.pizza_edges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.store_id = pizza_edges.store_id
  )
);

-- =============================================
-- PIZZA EDGE PRICES TABLE
-- =============================================
CREATE TABLE public.pizza_edge_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edge_id UUID NOT NULL REFERENCES public.pizza_edges(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(edge_id, size_id)
);

ALTER TABLE public.pizza_edge_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pizza edge prices"
ON public.pizza_edge_prices FOR SELECT
USING (true);

CREATE POLICY "Store owners can manage pizza edge prices"
ON public.pizza_edge_prices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pizza_edges pe
    JOIN public.profiles p ON p.store_id = pe.store_id
    WHERE pe.id = pizza_edge_prices.edge_id
    AND p.id = auth.uid()
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_pizza_sizes_updated_at
BEFORE UPDATE ON public.pizza_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pizza_flavors_updated_at
BEFORE UPDATE ON public.pizza_flavors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();