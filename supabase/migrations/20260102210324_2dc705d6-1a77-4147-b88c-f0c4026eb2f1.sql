-- Tabela de tamanhos de pizza
CREATE TABLE public.pizza_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de sabores de pizza
CREATE TABLE public.pizza_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT,
  image_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  premium_surcharge NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de bordas
CREATE TABLE public.pizza_borders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de coberturas/toppings
CREATE TABLE public.pizza_toppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies para pizza_sizes
ALTER TABLE public.pizza_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pizza sizes"
ON public.pizza_sizes FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage pizza sizes"
ON public.pizza_sizes FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies para pizza_flavors
ALTER TABLE public.pizza_flavors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pizza flavors"
ON public.pizza_flavors FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage pizza flavors"
ON public.pizza_flavors FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies para pizza_borders
ALTER TABLE public.pizza_borders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pizza borders"
ON public.pizza_borders FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage pizza borders"
ON public.pizza_borders FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- RLS Policies para pizza_toppings
ALTER TABLE public.pizza_toppings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pizza toppings"
ON public.pizza_toppings FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage pizza toppings"
ON public.pizza_toppings FOR ALL
USING (is_store_owner(auth.uid(), store_id));