-- Create payment_methods table for store customizable payment options
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon_type text NOT NULL DEFAULT 'money', -- 'card', 'pix', 'money'
  is_active boolean DEFAULT true,
  requires_change boolean DEFAULT false, -- For cash payments that may need change
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Anyone can read active payment methods
CREATE POLICY "Anyone can read active payment methods"
ON public.payment_methods
FOR SELECT
USING (is_active = true);

-- Owners can manage payment methods
CREATE POLICY "Owners can manage payment methods"
ON public.payment_methods
FOR ALL
USING (is_store_owner(auth.uid(), store_id));