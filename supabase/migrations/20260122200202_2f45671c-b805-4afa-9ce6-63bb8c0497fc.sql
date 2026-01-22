-- ========================================
-- PHASE 4: RLS HARDENING FOR PII TABLES
-- ========================================

-- 1. FIX customer_points TABLE
DROP POLICY IF EXISTS "Anyone can read their points" ON public.customer_points;

CREATE POLICY "Store owners read their store customer points" 
ON public.customer_points 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = customer_points.store_id 
    AND p.is_owner = true
  )
);

-- 2. FIX point_transactions TABLE
DROP POLICY IF EXISTS "Anyone can read their transactions" ON public.point_transactions;

CREATE POLICY "Store owners read their store transactions" 
ON public.point_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = point_transactions.store_id 
    AND p.is_owner = true
  )
);

-- 3. FIX reviews TABLE
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;

CREATE POLICY "Store owners read their store reviews" 
ON public.reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = reviews.store_id 
    AND p.is_owner = true
  )
);

CREATE POLICY "Public read reviews via view" 
ON public.reviews 
FOR SELECT 
USING (auth.role() = 'anon');

-- 4. FIX historico_whatsapp_pedido TABLE
DROP POLICY IF EXISTS "Anyone can read whatsapp history" ON public.historico_whatsapp_pedido;

CREATE POLICY "Store owners read their whatsapp history" 
ON public.historico_whatsapp_pedido 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON p.store_id = o.store_id
    WHERE o.id = historico_whatsapp_pedido.pedido_id
    AND p.id = auth.uid()
    AND p.is_owner = true
  )
);

-- 5. FIX table_reservations TABLE
DROP POLICY IF EXISTS "Public can create reservations validated" ON public.table_reservations;

CREATE POLICY "Public create reservations for active stores" 
ON public.table_reservations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s 
    WHERE s.id = table_reservations.store_id 
    AND s.is_active = true
  )
);

DROP POLICY IF EXISTS "Store owner reads reservations" ON public.table_reservations;
CREATE POLICY "Store owners read their reservations" 
ON public.table_reservations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = table_reservations.store_id 
    AND p.is_owner = true
  )
);

-- 6. CREATE SECURE VIEW FOR CUSTOMER LOYALTY
CREATE OR REPLACE VIEW public.v_customer_loyalty AS
SELECT 
  cp.id,
  cp.store_id,
  cp.total_points,
  cp.lifetime_points,
  cp.tier,
  cp.created_at,
  cp.updated_at,
  CASE 
    WHEN LENGTH(cp.customer_phone) > 4 
    THEN '***' || RIGHT(cp.customer_phone, 4)
    ELSE cp.customer_phone
  END AS customer_phone_masked,
  CASE 
    WHEN cp.customer_cpf IS NOT NULL AND LENGTH(cp.customer_cpf) > 3
    THEN '***' || RIGHT(cp.customer_cpf, 3)
    ELSE NULL
  END AS customer_cpf_masked,
  cp.customer_name
FROM public.customer_points cp
JOIN public.stores s ON s.id = cp.store_id
WHERE s.is_active = true;

ALTER VIEW public.v_customer_loyalty SET (security_invoker = true);
GRANT SELECT ON public.v_customer_loyalty TO anon, authenticated;

-- 7. SECURE FUNCTION FOR LOYALTY LOOKUP
CREATE OR REPLACE FUNCTION public.get_my_loyalty_points(
  p_store_id UUID,
  p_customer_phone TEXT
)
RETURNS TABLE (
  total_points INTEGER,
  lifetime_points INTEGER,
  customer_name TEXT,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
  
  RETURN QUERY
  SELECT 
    cp.total_points,
    cp.lifetime_points,
    cp.customer_name,
    cp.tier
  FROM public.customer_points cp
  WHERE cp.store_id = p_store_id
  AND regexp_replace(cp.customer_phone, '\D', '', 'g') = clean_phone
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_loyalty_points TO anon, authenticated;

-- 8. CREATE SECURE COUPONS VIEW FOR VALIDATION
CREATE OR REPLACE VIEW public.v_public_coupons_validation AS
SELECT 
  c.id,
  c.store_id,
  c.code,
  c.discount_type,
  c.discount_value,
  c.min_order_value,
  c.max_uses,
  c.uses_count,
  c.valid_from,
  c.valid_until,
  c.is_active,
  CASE 
    WHEN c.is_active = false THEN false
    WHEN c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN false
    WHEN c.valid_from IS NOT NULL AND NOW() < c.valid_from THEN false
    WHEN c.valid_until IS NOT NULL AND NOW() > c.valid_until THEN false
    ELSE true
  END AS is_currently_valid
FROM public.coupons c
JOIN public.stores s ON s.id = c.store_id
WHERE s.is_active = true;

ALTER VIEW public.v_public_coupons_validation SET (security_invoker = true);
GRANT SELECT ON public.v_public_coupons_validation TO anon, authenticated;