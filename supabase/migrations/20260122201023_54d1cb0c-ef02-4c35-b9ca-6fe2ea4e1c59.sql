-- ========================================
-- PHASE 7: CLEANUP DUPLICATE AND PERMISSIVE POLICIES
-- ========================================

-- ============================
-- 1. CLEANUP customer_points TABLE - Too many conflicting policies
-- ============================
DROP POLICY IF EXISTS "Allow anonymous insert to customer_points" ON public.customer_points;
DROP POLICY IF EXISTS "Allow anonymous update to customer_points" ON public.customer_points;
DROP POLICY IF EXISTS "Public can create customer points" ON public.customer_points;
DROP POLICY IF EXISTS "Public can update customer points with valid data" ON public.customer_points;
DROP POLICY IF EXISTS "Owners manage points" ON public.customer_points;
DROP POLICY IF EXISTS "Store owners can read their customer points" ON public.customer_points;
DROP POLICY IF EXISTS "Store owners can view their customer points" ON public.customer_points;
DROP POLICY IF EXISTS "Users can update points for their store" ON public.customer_points;

-- Keep only the essential policies:
-- "Store owners manage customer points" (FOR ALL) - main policy
-- "Store owners read their store customer points" (FOR SELECT) - redundant but harmless

-- ============================
-- 2. CLEANUP point_transactions TABLE
-- ============================
DROP POLICY IF EXISTS "Allow anonymous insert to point_transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Public can insert point transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Owners manage transactions" ON public.point_transactions;

-- ============================
-- 3. ENSURE reviews has proper policy for anon reading (via view)
-- The view v_public_reviews masks customer_phone, so anon access is safe
-- ============================

-- ============================
-- 4. CREATE v_public_customer_loyalty function for safe point lookup
-- This replaces direct table access for loyalty checking
-- ============================
-- Already created in Phase 4, ensure it's being used

COMMENT ON VIEW public.v_customer_loyalty IS 'Secure view for customer loyalty data with masked PII - use get_my_loyalty_points() for self-lookup';
COMMENT ON FUNCTION public.get_my_loyalty_points IS 'Secure function for customers to look up their own loyalty points by phone number';