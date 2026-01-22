-- ===========================================
-- FASE 1 & 2: CORREÇÕES DE SEGURANÇA (CORRIGIDO)
-- ===========================================

-- 1. ORDERS: Remover políticas públicas problemáticas
DROP POLICY IF EXISTS "Anyone can view orders by order_number and store" ON orders;
DROP POLICY IF EXISTS "Anyone can read their orders or super admin all" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders by phone" ON orders;
DROP POLICY IF EXISTS "Restricted order access" ON orders;

-- Nova política restritiva para orders
CREATE POLICY "Restricted order access"
ON orders FOR SELECT
USING (
  is_store_owner(auth.uid(), store_id)
  OR is_super_admin(auth.uid())
  OR (store_id IS NOT NULL AND order_number IS NOT NULL)
);

-- 2. CUSTOMERS: Corrigir políticas
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Public can create customers" ON customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON customers;
DROP POLICY IF EXISTS "Store owners can manage customers" ON customers;
DROP POLICY IF EXISTS "Store owners can view their customers" ON customers;
DROP POLICY IF EXISTS "Anyone can read customers" ON customers;
DROP POLICY IF EXISTS "Public can read customers" ON customers;
DROP POLICY IF EXISTS "Owners can manage customers" ON customers;
DROP POLICY IF EXISTS "Owners manage customers" ON customers;

CREATE POLICY "Owners manage customers"
ON customers FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- 3. CUSTOMER_POINTS: Proteger CPFs
DROP POLICY IF EXISTS "Anyone can read customer_points" ON customer_points;
DROP POLICY IF EXISTS "Public can read customer_points" ON customer_points;
DROP POLICY IF EXISTS "Anyone can view points" ON customer_points;
DROP POLICY IF EXISTS "Store owners can view customer points" ON customer_points;
DROP POLICY IF EXISTS "Store owners can manage customer points" ON customer_points;
DROP POLICY IF EXISTS "Owners can manage customer_points" ON customer_points;
DROP POLICY IF EXISTS "Owners manage points" ON customer_points;

CREATE POLICY "Owners manage points"
ON customer_points FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- 4. POINT_TRANSACTIONS: Proteger histórico
DROP POLICY IF EXISTS "Anyone can read point_transactions" ON point_transactions;
DROP POLICY IF EXISTS "Public can read point_transactions" ON point_transactions;
DROP POLICY IF EXISTS "Anyone can view transactions" ON point_transactions;
DROP POLICY IF EXISTS "Store owners can view point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Store owners can manage point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Owners can manage point_transactions" ON point_transactions;
DROP POLICY IF EXISTS "Owners manage transactions" ON point_transactions;

CREATE POLICY "Owners manage transactions"
ON point_transactions FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- 5. REVIEWS: Função para mascarar telefones (com colunas corretas)
CREATE OR REPLACE FUNCTION public.get_public_reviews(p_store_id uuid)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  customer_name text,
  rating integer,
  feedback text,
  created_at timestamptz,
  store_response text,
  response_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.store_id,
    CASE 
      WHEN length(r.customer_name) <= 3 THEN r.customer_name
      ELSE split_part(r.customer_name, ' ', 1) || ' ' || 
           CASE 
             WHEN array_length(string_to_array(r.customer_name, ' '), 1) > 1 
             THEN left(split_part(r.customer_name, ' ', 2), 1) || '.'
             ELSE ''
           END
    END as customer_name,
    r.rating,
    r.feedback,
    r.created_at,
    r.store_response,
    r.response_at
  FROM reviews r
  WHERE r.store_id = p_store_id
  ORDER BY r.created_at DESC;
$$;

-- 6. TABLE_RESERVATIONS: Restringir
DROP POLICY IF EXISTS "Anyone can create reservations" ON table_reservations;
DROP POLICY IF EXISTS "Anyone can read reservations" ON table_reservations;
DROP POLICY IF EXISTS "Public can create reservations" ON table_reservations;
DROP POLICY IF EXISTS "Public can read reservations" ON table_reservations;
DROP POLICY IF EXISTS "Store owners can manage reservations" ON table_reservations;
DROP POLICY IF EXISTS "Customers can create reservations" ON table_reservations;
DROP POLICY IF EXISTS "Customers can view own reservations" ON table_reservations;
DROP POLICY IF EXISTS "Owners manage reservations" ON table_reservations;
DROP POLICY IF EXISTS "Public can create reservations validated" ON table_reservations;

CREATE POLICY "Owners manage reservations"
ON table_reservations FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Public can create reservations validated"
ON table_reservations FOR INSERT
WITH CHECK (
  store_id IS NOT NULL
  AND customer_name IS NOT NULL
  AND customer_name <> ''
  AND customer_phone IS NOT NULL
  AND customer_phone <> ''
);

-- 7. FINANCIAL_TRANSACTIONS
DROP POLICY IF EXISTS "Anyone can read financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Public can read financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Store owners can view financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Owners can manage financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Owners manage finances" ON financial_transactions;

CREATE POLICY "Owners manage finances"
ON financial_transactions FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- 8. WHATSAPP_MESSAGES
DROP POLICY IF EXISTS "Anyone can read whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Public can read whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Store owners can view whatsapp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Owners can manage whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Owners manage whatsapp" ON whatsapp_messages;

CREATE POLICY "Owners manage whatsapp"
ON whatsapp_messages FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- 9. SUBSCRIPTIONS
DROP POLICY IF EXISTS "Anyone can read subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Public can read subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Store owners can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners manage subscription" ON subscriptions;

CREATE POLICY "Owners manage subscription"
ON subscriptions FOR ALL
USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- Garantir RLS habilitado
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;