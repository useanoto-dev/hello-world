-- Fix security issues: Remove public write access to sensitive tables
-- The SECURITY DEFINER functions (update_saved_customer_stats, generate_order_number) 
-- already handle these operations, so public policies are not needed

-- 1. Remove public INSERT policy from saved_customers
DROP POLICY IF EXISTS "Public can insert saved customers" ON public.saved_customers;

-- 2. Remove public UPDATE policy from saved_customers  
DROP POLICY IF EXISTS "Public can update saved customers" ON public.saved_customers;

-- 3. Remove public UPDATE policy from order_counter
DROP POLICY IF EXISTS "Public can update order counter" ON public.order_counter;

-- 4. Add admin-only policies for saved_customers management
CREATE POLICY "Admins can manage saved customers" 
ON public.saved_customers 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

-- 5. Add admin-only UPDATE policy for order_counter
CREATE POLICY "Admins can update order counter" 
ON public.order_counter 
FOR UPDATE 
USING (is_admin_or_manager(auth.uid()));