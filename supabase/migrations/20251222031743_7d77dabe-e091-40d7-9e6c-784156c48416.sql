-- Drop and recreate policies with explicit role targeting
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Create INSERT policy for orders - explicitly targeting public role
CREATE POLICY "Public can create orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK (true);

-- Create INSERT policy for order_items - explicitly targeting public role  
CREATE POLICY "Public can create order items" 
ON public.order_items 
FOR INSERT 
TO public
WITH CHECK (true);