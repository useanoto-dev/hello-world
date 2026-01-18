-- Fix RLS Policy Issues: Remove redundant USING(true) SELECT policies and tighten INSERT policies

-- 1. Drop redundant SELECT policies that use USING (true) - these are covered by more specific policies
DROP POLICY IF EXISTS "Store owners can select coupons" ON public.coupons;
DROP POLICY IF EXISTS "Store owners can select products" ON public.products;
DROP POLICY IF EXISTS "Store owners can select categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can select banners" ON public.banners;

-- 2. Fix stores INSERT policy - restrict to authenticated users with proper check
DROP POLICY IF EXISTS "Authenticated users can create stores" ON public.stores;
CREATE POLICY "Authenticated users can create stores" 
ON public.stores FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix subscriptions INSERT policy - restrict to authenticated users with proper check
DROP POLICY IF EXISTS "Authenticated users can create subscriptions" ON public.subscriptions;
CREATE POLICY "Authenticated users can create subscriptions" 
ON public.subscriptions FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Ensure access_codes table has proper RLS policies for store owners only
-- First drop any existing policies
DROP POLICY IF EXISTS "Store owners can manage access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Staff can use access codes" ON public.access_codes;
DROP POLICY IF EXISTS "access_codes_select_policy" ON public.access_codes;
DROP POLICY IF EXISTS "access_codes_insert_policy" ON public.access_codes;
DROP POLICY IF EXISTS "access_codes_update_policy" ON public.access_codes;
DROP POLICY IF EXISTS "access_codes_delete_policy" ON public.access_codes;

-- Create proper policies for access_codes - only store owners can manage
CREATE POLICY "Store owners can view access codes" 
ON public.access_codes FOR SELECT 
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can create access codes" 
ON public.access_codes FOR INSERT 
WITH CHECK (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can update access codes" 
ON public.access_codes FOR UPDATE 
USING (is_store_owner(auth.uid(), store_id))
WITH CHECK (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store owners can delete access codes" 
ON public.access_codes FOR DELETE 
USING (is_store_owner(auth.uid(), store_id));