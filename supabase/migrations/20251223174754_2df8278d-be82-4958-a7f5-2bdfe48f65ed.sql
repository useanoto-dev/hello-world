-- Drop existing order-related tables and recreate simplified structure
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS financial_summary CASCADE;
DROP TABLE IF EXISTS order_counter CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;

-- Create simplified orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hour_only TEXT NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
  order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'retirada')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'novo',
  address JSONB
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all orders" ON public.orders
FOR SELECT USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update orders" ON public.orders
FOR UPDATE USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can delete orders" ON public.orders
FOR DELETE USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Anyone can insert orders" ON public.orders
FOR INSERT WITH CHECK (true);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_print_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read settings" ON public.system_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON public.system_settings
FOR UPDATE USING (is_admin_or_manager(auth.uid()));

-- Insert default settings
INSERT INTO public.system_settings (auto_print_enabled) VALUES (false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER TABLE orders REPLICA IDENTITY FULL;