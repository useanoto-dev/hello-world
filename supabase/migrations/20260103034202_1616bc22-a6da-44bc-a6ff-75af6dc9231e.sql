-- Create acai_sizes table (base sizes with prices)
CREATE TABLE public.acai_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create acai_ice_creams table (cremes gelados - checkbox with max quantity)
CREATE TABLE public.acai_ice_creams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create acai_simple_toppings table (adicionais simples - quantity control)
CREATE TABLE public.acai_simple_toppings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create acai_special_toppings table (adicionais especiais - quantity control)
CREATE TABLE public.acai_special_toppings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create acai_syrups table (coberturas - checkbox with max quantity)
CREATE TABLE public.acai_syrups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create acai_settings table for admin-defined limits
CREATE TABLE public.acai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  max_ice_creams INTEGER DEFAULT 3,
  max_syrups INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.acai_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acai_ice_creams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acai_simple_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acai_special_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acai_syrups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acai_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for acai_sizes
CREATE POLICY "Owners can manage acai sizes" ON public.acai_sizes FOR ALL USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Anyone can read active acai sizes" ON public.acai_sizes FOR SELECT USING (is_active = true);

-- RLS policies for acai_ice_creams
CREATE POLICY "Owners can manage acai ice creams" ON public.acai_ice_creams FOR ALL USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Anyone can read active acai ice creams" ON public.acai_ice_creams FOR SELECT USING (is_active = true);

-- RLS policies for acai_simple_toppings
CREATE POLICY "Owners can manage acai simple toppings" ON public.acai_simple_toppings FOR ALL USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Anyone can read active acai simple toppings" ON public.acai_simple_toppings FOR SELECT USING (is_active = true);

-- RLS policies for acai_special_toppings
CREATE POLICY "Owners can manage acai special toppings" ON public.acai_special_toppings FOR ALL USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Anyone can read active acai special toppings" ON public.acai_special_toppings FOR SELECT USING (is_active = true);

-- RLS policies for acai_syrups
CREATE POLICY "Owners can manage acai syrups" ON public.acai_syrups FOR ALL USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Anyone can read active acai syrups" ON public.acai_syrups FOR SELECT USING (is_active = true);

-- RLS policies for acai_settings
CREATE POLICY "Owners can manage acai settings" ON public.acai_settings FOR ALL USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Anyone can read acai settings" ON public.acai_settings FOR SELECT USING (true);