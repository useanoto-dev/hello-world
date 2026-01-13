-- Create customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  address jsonb,
  notes text,
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_order_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(store_id, phone)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can manage customers"
ON public.customers
FOR ALL
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Anyone can read customers by phone"
ON public.customers
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to upsert customer from order
CREATE OR REPLACE FUNCTION public.upsert_customer_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (store_id, name, phone, email, address, total_orders, total_spent, last_order_at)
  VALUES (
    NEW.store_id,
    NEW.customer_name,
    NEW.customer_phone,
    NEW.customer_email,
    NEW.address,
    1,
    NEW.total,
    NEW.created_at
  )
  ON CONFLICT (store_id, phone)
  DO UPDATE SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, customers.email),
    address = COALESCE(EXCLUDED.address, customers.address),
    total_orders = customers.total_orders + 1,
    total_spent = customers.total_spent + EXCLUDED.total_spent,
    last_order_at = EXCLUDED.last_order_at,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update customers on new orders
CREATE TRIGGER on_order_created_update_customer
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_customer_from_order();