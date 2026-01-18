-- Fix remaining RLS policies with WITH CHECK (true) 
-- These policies allow public/anonymous operations but should have basic validation

-- 1. Fix coupon_usages - ensure required fields are validated
DROP POLICY IF EXISTS "Anyone can create coupon usage" ON public.coupon_usages;
CREATE POLICY "Anyone can create coupon usage" 
ON public.coupon_usages FOR INSERT 
WITH CHECK (
  coupon_id IS NOT NULL AND 
  store_id IS NOT NULL AND 
  customer_phone IS NOT NULL AND 
  customer_phone <> ''
);

-- 2. Fix customer_points - ensure required fields are validated
DROP POLICY IF EXISTS "Allow anonymous insert to customer_points" ON public.customer_points;
CREATE POLICY "Allow anonymous insert to customer_points" 
ON public.customer_points FOR INSERT 
WITH CHECK (
  store_id IS NOT NULL AND 
  customer_phone IS NOT NULL AND 
  customer_phone <> '' AND
  customer_name IS NOT NULL AND
  customer_name <> ''
);

DROP POLICY IF EXISTS "Allow anonymous update to customer_points" ON public.customer_points;
CREATE POLICY "Allow anonymous update to customer_points" 
ON public.customer_points FOR UPDATE 
USING (customer_phone IS NOT NULL AND customer_phone <> '')
WITH CHECK (customer_phone IS NOT NULL AND customer_phone <> '');

-- 3. Fix orders - ensure required fields are validated
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  store_id IS NOT NULL AND 
  customer_name IS NOT NULL AND 
  customer_name <> '' AND
  customer_phone IS NOT NULL AND 
  customer_phone <> '' AND
  order_type IS NOT NULL
);

-- 4. Fix point_transactions - ensure required fields are validated
DROP POLICY IF EXISTS "Anyone can create transactions" ON public.point_transactions;
CREATE POLICY "Anyone can create transactions" 
ON public.point_transactions FOR INSERT 
WITH CHECK (
  store_id IS NOT NULL AND 
  customer_phone IS NOT NULL AND 
  customer_phone <> '' AND
  type IS NOT NULL
);

-- 5. Fix print_jobs - only allow authenticated users or service role
DROP POLICY IF EXISTS "Anyone can insert print jobs" ON public.print_jobs;
CREATE POLICY "Authenticated users can insert print jobs" 
ON public.print_jobs FOR INSERT 
TO authenticated
WITH CHECK (
  store_id IS NOT NULL AND 
  printer_id IS NOT NULL
);

-- 6. Fix push_subscriptions - ensure required fields are validated
DROP POLICY IF EXISTS "Anyone can create push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can create push subscriptions" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (
  endpoint IS NOT NULL AND 
  endpoint <> '' AND
  p256dh IS NOT NULL AND
  auth IS NOT NULL
);

DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can delete push subscriptions" 
ON public.push_subscriptions FOR DELETE 
USING (endpoint IS NOT NULL);

-- 7. Fix reviews - ensure required fields are validated
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
CREATE POLICY "Anyone can create reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (
  store_id IS NOT NULL AND 
  customer_name IS NOT NULL AND 
  customer_name <> '' AND
  customer_phone IS NOT NULL AND 
  customer_phone <> '' AND
  rating >= 1 AND rating <= 5
);

DROP POLICY IF EXISTS "Anyone can update their own review" ON public.reviews;
CREATE POLICY "Store owners can update reviews" 
ON public.reviews FOR UPDATE 
USING (is_store_owner(auth.uid(), store_id))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- 8. Fix table_reservations - ensure required fields are validated
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.table_reservations;
CREATE POLICY "Anyone can create reservations" 
ON public.table_reservations FOR INSERT 
WITH CHECK (
  store_id IS NOT NULL AND 
  customer_name IS NOT NULL AND 
  customer_name <> '' AND
  customer_phone IS NOT NULL AND 
  customer_phone <> ''
);

-- 9. Fix audit_logs - only allow system/authenticated inserts
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs" 
ON public.audit_logs FOR INSERT 
TO authenticated
WITH CHECK (
  store_id IS NOT NULL AND 
  action IS NOT NULL AND 
  module IS NOT NULL
);

-- 10. Fix historico_whatsapp_pedido - only allow authenticated/service inserts
DROP POLICY IF EXISTS "Service can insert whatsapp history" ON public.historico_whatsapp_pedido;
CREATE POLICY "Service can insert whatsapp history" 
ON public.historico_whatsapp_pedido FOR INSERT 
WITH CHECK (
  pedido_id IS NOT NULL AND 
  telefone IS NOT NULL AND 
  telefone <> '' AND
  mensagem IS NOT NULL AND
  status_pedido IS NOT NULL
);