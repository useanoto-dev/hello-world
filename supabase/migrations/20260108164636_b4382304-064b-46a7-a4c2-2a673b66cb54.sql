-- Fix RLS policies: Add store_id verification on UPDATE operations

-- customer_points: Add store_id check for UPDATE
DROP POLICY IF EXISTS "Users can update their own points" ON public.customer_points;
CREATE POLICY "Users can update points for their store"
ON public.customer_points
FOR UPDATE
USING (
  store_id = public.get_user_store_id(auth.uid())
);

-- coupon_usages: Add store_id check for UPDATE
DROP POLICY IF EXISTS "Users can update coupon usages" ON public.coupon_usages;
CREATE POLICY "Users can update coupon usages for their store"
ON public.coupon_usages
FOR UPDATE
USING (
  store_id = public.get_user_store_id(auth.uid())
);

-- inventory_movements: Add store_id check for UPDATE
DROP POLICY IF EXISTS "Users can update inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can update inventory movements for their store"
ON public.inventory_movements
FOR UPDATE
USING (
  store_id = public.get_user_store_id(auth.uid())
);

-- customers: Replace permissive SELECT policy with store-scoped one
DROP POLICY IF EXISTS "Anyone can read customers" ON public.customers;
CREATE POLICY "Store owners can read their customers"
ON public.customers
FOR SELECT
USING (
  store_id = public.get_user_store_id(auth.uid())
);

-- reviews: Replace permissive SELECT policy (reviews can be public for display)
-- But UPDATE/DELETE should be restricted
DROP POLICY IF EXISTS "Users can update reviews" ON public.reviews;
CREATE POLICY "Store owners can update their reviews"
ON public.reviews
FOR UPDATE
USING (
  store_id = public.get_user_store_id(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete reviews" ON public.reviews;
CREATE POLICY "Store owners can delete their reviews"
ON public.reviews
FOR DELETE
USING (
  store_id = public.get_user_store_id(auth.uid())
);

-- point_transactions: Add store_id check for UPDATE
DROP POLICY IF EXISTS "Users can update point transactions" ON public.point_transactions;
CREATE POLICY "Store owners can update point transactions"
ON public.point_transactions
FOR UPDATE
USING (
  store_id = public.get_user_store_id(auth.uid())
);

-- Also fix SELECT policies that were too permissive
DROP POLICY IF EXISTS "Anyone can read customer_points" ON public.customer_points;
CREATE POLICY "Store owners can read their customer points"
ON public.customer_points
FOR SELECT
USING (
  store_id = public.get_user_store_id(auth.uid())
);

DROP POLICY IF EXISTS "Anyone can read point_transactions" ON public.point_transactions;
CREATE POLICY "Store owners can read their point transactions"
ON public.point_transactions
FOR SELECT
USING (
  store_id = public.get_user_store_id(auth.uid())
);