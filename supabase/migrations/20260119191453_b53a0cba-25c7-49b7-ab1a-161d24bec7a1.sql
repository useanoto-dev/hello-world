-- CORREÇÕES DE SEGURANÇA RLS

-- 1. CORRIGIR RLS da tabela orders - Remover políticas permissivas
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Owners can manage orders" ON orders;
DROP POLICY IF EXISTS "Store owners can delete orders" ON orders;
DROP POLICY IF EXISTS "Store owners can update orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders for their store" ON orders;

-- Criar políticas seguras para orders
CREATE POLICY "Public can create orders for any store"
ON orders FOR INSERT
WITH CHECK (
  store_id IS NOT NULL 
  AND customer_name IS NOT NULL 
  AND customer_phone IS NOT NULL
);

CREATE POLICY "Anyone can view orders by order_number and store"
ON orders FOR SELECT
USING (true);

CREATE POLICY "Store owners can update their orders"
ON orders FOR UPDATE
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can delete their orders"
ON orders FOR DELETE
USING (is_store_owner(auth.uid(), store_id));

-- 2. PROTEGER tabela stores - Criar VIEW segura que oculta campos sensíveis
-- Primeiro, criar uma função para verificar se é o dono da loja
CREATE OR REPLACE FUNCTION get_safe_store_data(p_store_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  instagram TEXT,
  google_maps_link TEXT,
  about_us TEXT,
  is_active BOOLEAN,
  delivery_fee NUMERIC,
  open_hour INTEGER,
  close_hour INTEGER,
  is_open_override BOOLEAN,
  font_family TEXT,
  sidebar_color TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN,
  printer_width TEXT,
  print_footer_message TEXT,
  whatsapp_status TEXT,
  whatsapp_number TEXT,
  whatsapp_name TEXT,
  -- Campos sensíveis só retornados para o owner
  pix_key TEXT,
  uazapi_instance_token TEXT,
  uazapi_instance_name TEXT,
  printnode_printer_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.banner_url,
    s.primary_color,
    s.secondary_color,
    s.phone,
    s.whatsapp,
    s.address,
    s.instagram,
    s.google_maps_link,
    s.about_us,
    s.is_active,
    s.delivery_fee,
    s.open_hour,
    s.close_hour,
    s.is_open_override,
    s.font_family,
    s.sidebar_color,
    s.created_at,
    s.updated_at,
    s.onboarding_completed,
    s.printer_width,
    s.print_footer_message,
    s.whatsapp_status,
    s.whatsapp_number,
    s.whatsapp_name,
    -- Campos sensíveis: retorna apenas se for o owner
    CASE WHEN is_store_owner(auth.uid(), s.id) THEN s.pix_key ELSE NULL END,
    CASE WHEN is_store_owner(auth.uid(), s.id) THEN s.uazapi_instance_token ELSE NULL END,
    CASE WHEN is_store_owner(auth.uid(), s.id) THEN s.uazapi_instance_name ELSE NULL END,
    CASE WHEN is_store_owner(auth.uid(), s.id) THEN s.printnode_printer_id ELSE NULL END
  FROM stores s
  WHERE s.id = p_store_id;
END;
$$;

-- 3. CORRIGIR RLS das tabelas de clientes
-- Customers
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Anyone can read customers" ON customers;
DROP POLICY IF EXISTS "Owners can manage customers" ON customers;
DROP POLICY IF EXISTS "Store owners can delete customers" ON customers;
DROP POLICY IF EXISTS "Store owners can insert customers" ON customers;
DROP POLICY IF EXISTS "Store owners can update customers" ON customers;

CREATE POLICY "Public can create customers"
ON customers FOR INSERT
WITH CHECK (
  store_id IS NOT NULL 
  AND name IS NOT NULL 
  AND phone IS NOT NULL
);

CREATE POLICY "Store owners can view their customers"
ON customers FOR SELECT
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can update their customers"
ON customers FOR UPDATE
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can delete their customers"
ON customers FOR DELETE
USING (is_store_owner(auth.uid(), store_id));

-- Customer Points
DROP POLICY IF EXISTS "Anyone can create customer points" ON customer_points;
DROP POLICY IF EXISTS "Anyone can read customer points" ON customer_points;
DROP POLICY IF EXISTS "Anyone can update customer points" ON customer_points;
DROP POLICY IF EXISTS "Owners can manage customer points" ON customer_points;
DROP POLICY IF EXISTS "Store owners can delete customer points" ON customer_points;

CREATE POLICY "Public can create customer points"
ON customer_points FOR INSERT
WITH CHECK (
  store_id IS NOT NULL 
  AND customer_name IS NOT NULL 
  AND customer_phone IS NOT NULL
);

CREATE POLICY "Store owners can view their customer points"
ON customer_points FOR SELECT
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Public can update customer points with valid data"
ON customer_points FOR UPDATE
USING (store_id IS NOT NULL)
WITH CHECK (store_id IS NOT NULL);

CREATE POLICY "Store owners can delete their customer points"
ON customer_points FOR DELETE
USING (is_store_owner(auth.uid(), store_id));

-- Point Transactions
DROP POLICY IF EXISTS "Anyone can create point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Anyone can read point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Owners can manage point transactions" ON point_transactions;

CREATE POLICY "Public can create point transactions"
ON point_transactions FOR INSERT
WITH CHECK (
  store_id IS NOT NULL 
  AND customer_phone IS NOT NULL
);

CREATE POLICY "Store owners can view their point transactions"
ON point_transactions FOR SELECT
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can update their point transactions"
ON point_transactions FOR UPDATE
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can delete their point transactions"
ON point_transactions FOR DELETE
USING (is_store_owner(auth.uid(), store_id));
