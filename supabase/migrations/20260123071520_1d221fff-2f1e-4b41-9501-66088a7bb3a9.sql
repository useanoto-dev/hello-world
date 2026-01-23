-- Beverage Types table (subcategories for beverages)
CREATE TABLE public.beverage_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.beverage_types ENABLE ROW LEVEL SECURITY;

-- Create policies for beverage_types
CREATE POLICY "Anyone can view active beverage types" 
ON public.beverage_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Store owners can manage beverage types" 
ON public.beverage_types 
FOR ALL 
USING (public.is_store_owner(auth.uid(), store_id));

-- Add index for performance
CREATE INDEX idx_beverage_types_category_id ON public.beverage_types(category_id);
CREATE INDEX idx_beverage_types_store_id ON public.beverage_types(store_id);

-- Beverage Products table (products within each beverage type)
CREATE TABLE public.beverage_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  beverage_type_id UUID NOT NULL REFERENCES public.beverage_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  promotional_price NUMERIC,
  promotion_start_at TIMESTAMP WITH TIME ZONE,
  promotion_end_at TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.beverage_products ENABLE ROW LEVEL SECURITY;

-- Create policies for beverage_products
CREATE POLICY "Anyone can view active beverage products" 
ON public.beverage_products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Store owners can manage beverage products" 
ON public.beverage_products 
FOR ALL 
USING (public.is_store_owner(auth.uid(), store_id));

-- Add indexes for performance
CREATE INDEX idx_beverage_products_beverage_type_id ON public.beverage_products(beverage_type_id);
CREATE INDEX idx_beverage_products_category_id ON public.beverage_products(category_id);
CREATE INDEX idx_beverage_products_store_id ON public.beverage_products(store_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beverage_types_updated_at
BEFORE UPDATE ON public.beverage_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beverage_products_updated_at
BEFORE UPDATE ON public.beverage_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();