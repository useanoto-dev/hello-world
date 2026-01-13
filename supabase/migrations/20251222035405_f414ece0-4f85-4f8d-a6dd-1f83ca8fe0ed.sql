-- Garantir que políticas de INSERT para orders existam
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

CREATE POLICY "Anyone can insert orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK (true);

-- Garantir que políticas de INSERT para order_items existam
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
TO public
WITH CHECK (true);