-- Create delivery_areas table for managing delivery zones with different fees
CREATE TABLE public.delivery_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  min_order_value NUMERIC DEFAULT 0,
  estimated_time INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Anyone can read active delivery areas (for checkout)
CREATE POLICY "Anyone can read active delivery areas"
ON public.delivery_areas
FOR SELECT
USING (is_active = true);

-- Owners can manage delivery areas
CREATE POLICY "Owners can manage delivery areas"
ON public.delivery_areas
FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Add index for performance
CREATE INDEX idx_delivery_areas_store_id ON public.delivery_areas(store_id);