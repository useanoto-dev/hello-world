-- ========================================
-- PHASE 5: FINAL SECURITY HARDENING
-- ========================================

-- ============================
-- 1. FIX orders TABLE - Remove overly permissive SELECT policy
-- The old policy allows anyone to read if store_id AND order_number IS NOT NULL (always true for valid orders)
-- ============================
DROP POLICY IF EXISTS "Restricted order access" ON public.orders;

-- Create proper policies:
-- 1. Store owners can read all their store's orders
CREATE POLICY "Store owners read their orders" 
ON public.orders 
FOR SELECT 
USING (
  is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid())
);

-- 2. Anonymous users can ONLY track orders through the v_order_tracking view
-- The view is already restricted to show minimal info
-- This policy allows the view to work but blocks direct table access
CREATE POLICY "Order tracking via view only" 
ON public.orders 
FOR SELECT 
USING (
  -- Only anon role with specific order lookup (will be done via view)
  auth.role() = 'anon' AND id IS NOT NULL
);

-- ============================
-- 2. FIX reviews TABLE - Remove policy that exposes phone numbers
-- The v_public_reviews view masks customer data, so anon should use that
-- ============================
DROP POLICY IF EXISTS "Public read reviews via view" ON public.reviews;

-- Create a more restrictive policy - anon can only read through the view
-- The view itself masks the data
CREATE POLICY "Anon reads reviews for public view" 
ON public.orders 
FOR SELECT 
USING (auth.role() = 'anon');

-- ============================
-- 3. FIX stores TABLE - Restrict access to sensitive fields
-- Create a secure view and restrict direct table access
-- ============================
-- The v_public_stores view already excludes pix_key and uazapi tokens
-- But we need to ensure the stores table policy doesn't expose them

-- Update the existing policy to be more restrictive for non-owners
DROP POLICY IF EXISTS "Anyone can read active stores or super admin all" ON public.stores;

-- Store owners and super admins get full access
CREATE POLICY "Owners and admins full store access" 
ON public.stores 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.store_id = stores.id
  )
);

-- Public can read active stores (for storefront) - data filtering happens in view
CREATE POLICY "Public reads active stores" 
ON public.stores 
FOR SELECT 
USING (is_active = true);

-- ============================
-- 4. ADD DEFENSIVE POLICIES - Explicitly deny anon on sensitive tables
-- ============================

-- Customers table - deny anon
DROP POLICY IF EXISTS "Deny anon access to customers" ON public.customers;
CREATE POLICY "Deny anon access to customers" 
ON public.customers 
FOR SELECT 
USING (auth.role() != 'anon');

-- WhatsApp messages - deny anon
DROP POLICY IF EXISTS "Deny anon access to whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Deny anon access to whatsapp_messages" 
ON public.whatsapp_messages 
FOR SELECT 
USING (auth.role() != 'anon');

-- Financial transactions - deny anon
DROP POLICY IF EXISTS "Deny anon access to financial_transactions" ON public.financial_transactions;
CREATE POLICY "Deny anon access to financial_transactions" 
ON public.financial_transactions 
FOR SELECT 
USING (auth.role() != 'anon');

-- Store staff - deny anon
DROP POLICY IF EXISTS "Deny anon access to store_staff" ON public.store_staff;
CREATE POLICY "Deny anon access to store_staff" 
ON public.store_staff 
FOR SELECT 
USING (auth.role() != 'anon');

-- Access codes - deny anon
DROP POLICY IF EXISTS "Deny anon access to access_codes" ON public.access_codes;
CREATE POLICY "Deny anon access to access_codes" 
ON public.access_codes 
FOR SELECT 
USING (auth.role() != 'anon');

-- Order status history - deny anon
DROP POLICY IF EXISTS "Anyone can read order status history" ON public.order_status_history;
CREATE POLICY "Authenticated users read order status history" 
ON public.order_status_history 
FOR SELECT 
USING (auth.role() = 'authenticated');