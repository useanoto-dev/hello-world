-- Create pizza doughs table
CREATE TABLE public.pizza_doughs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pizza dough prices table (price per size)
CREATE TABLE public.pizza_dough_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dough_id UUID NOT NULL REFERENCES public.pizza_doughs(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dough_id, size_id)
);

-- Enable RLS
ALTER TABLE public.pizza_doughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_dough_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for pizza_doughs
CREATE POLICY "Anyone can view active pizza doughs" ON public.pizza_doughs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Store owners can manage pizza doughs" ON public.pizza_doughs
  FOR ALL USING (public.is_store_owner(auth.uid(), store_id));

-- RLS policies for pizza_dough_prices
CREATE POLICY "Anyone can view pizza dough prices" ON public.pizza_dough_prices
  FOR SELECT USING (true);

CREATE POLICY "Store owners can manage pizza dough prices" ON public.pizza_dough_prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pizza_doughs d
      WHERE d.id = dough_id AND public.is_store_owner(auth.uid(), d.store_id)
    )
  );

-- Create indexes
CREATE INDEX idx_pizza_doughs_store_id ON public.pizza_doughs(store_id);
CREATE INDEX idx_pizza_doughs_category_id ON public.pizza_doughs(category_id);
CREATE INDEX idx_pizza_dough_prices_dough_id ON public.pizza_dough_prices(dough_id);
CREATE INDEX idx_pizza_dough_prices_size_id ON public.pizza_dough_prices(size_id);