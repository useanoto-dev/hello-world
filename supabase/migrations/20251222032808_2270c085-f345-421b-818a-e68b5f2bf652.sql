-- Remover políticas de INSERT existentes
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;

-- Criar política INSERT para orders permitindo roles anon e authenticated
CREATE POLICY "Anyone can insert orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Criar política INSERT para order_items permitindo roles anon e authenticated
CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);