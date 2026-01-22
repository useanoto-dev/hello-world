-- ========================================
-- PHASE 6: FIX REMAINING SECURITY ISSUES
-- ========================================

-- ============================
-- 1. FIX orders TABLE - Remove the wrong policies
-- ============================
DROP POLICY IF EXISTS "Anon reads reviews for public view" ON public.orders;
DROP POLICY IF EXISTS "Order tracking via view only" ON public.orders;

-- ============================
-- 2. FIX stores TABLE
-- ============================
DROP POLICY IF EXISTS "Public reads active stores" ON public.stores;

CREATE POLICY "Public reads stores via secure view" 
ON public.stores 
FOR SELECT 
USING (is_active = true);

-- ============================
-- 3. FIX mensagens_automaticas_whatsapp TABLE
-- ============================
DROP POLICY IF EXISTS "Public reads mensagens" ON public.mensagens_automaticas_whatsapp;
DROP POLICY IF EXISTS "Anyone can read whatsapp auto messages" ON public.mensagens_automaticas_whatsapp;

CREATE POLICY "Store owners manage auto messages" 
ON public.mensagens_automaticas_whatsapp 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = mensagens_automaticas_whatsapp.restaurant_id 
    AND p.is_owner = true
  )
);

-- ============================
-- 4. Add policy to reviews for anon to read via view
-- ============================
CREATE POLICY "Anon reads reviews via public view" 
ON public.reviews 
FOR SELECT 
USING (auth.role() = 'anon');

-- ============================
-- 5. FIX customer_points and point_transactions INSERT policies
-- ============================
DROP POLICY IF EXISTS "Anyone can create points" ON public.customer_points;
DROP POLICY IF EXISTS "Anyone can update points" ON public.customer_points;
DROP POLICY IF EXISTS "Public can insert points" ON public.customer_points;
DROP POLICY IF EXISTS "Public can update points" ON public.customer_points;

CREATE POLICY "Store owners manage customer points" 
ON public.customer_points 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = customer_points.store_id 
    AND p.is_owner = true
  )
);

DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Public can insert transactions" ON public.point_transactions;

CREATE POLICY "Store owners manage point transactions" 
ON public.point_transactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = point_transactions.store_id 
    AND p.is_owner = true
  )
);