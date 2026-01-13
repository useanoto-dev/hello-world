-- Drop existing policies for orders that might conflict
DROP POLICY IF EXISTS "Owners can manage orders" ON public.orders;

-- Create separate, explicit policies for each operation
-- SELECT policy (keep existing)
-- Note: "Anyone can read their orders or super admin all" already exists

-- INSERT policy already exists: "Anyone can create orders"

-- Create UPDATE policy for store owners
CREATE POLICY "Store owners can update orders" 
ON public.orders 
FOR UPDATE 
USING (is_store_owner(auth.uid(), store_id))
WITH CHECK (is_store_owner(auth.uid(), store_id));

-- Create DELETE policy for store owners
CREATE POLICY "Store owners can delete orders" 
ON public.orders 
FOR DELETE 
USING (is_store_owner(auth.uid(), store_id));

-- Also fix other common tables that might have delete issues

-- Tables table
DROP POLICY IF EXISTS "Store owners can manage their tables" ON public.tables;
CREATE POLICY "Store owners can select tables" ON public.tables FOR SELECT USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can insert tables" ON public.tables FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update tables" ON public.tables FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete tables" ON public.tables FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Products table
DROP POLICY IF EXISTS "Owners can manage their products" ON public.products;
CREATE POLICY "Store owners can select products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Store owners can insert products" ON public.products FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update products" ON public.products FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete products" ON public.products FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Categories table
DROP POLICY IF EXISTS "Owners can manage their categories" ON public.categories;
CREATE POLICY "Store owners can select categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Store owners can insert categories" ON public.categories FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update categories" ON public.categories FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete categories" ON public.categories FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Customers table
DROP POLICY IF EXISTS "Owners can manage their customers" ON public.customers;
CREATE POLICY "Store owners can select customers" ON public.customers FOR SELECT USING (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can insert customers" ON public.customers FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update customers" ON public.customers FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete customers" ON public.customers FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Coupons table
DROP POLICY IF EXISTS "Owners can manage their coupons" ON public.coupons;
CREATE POLICY "Store owners can select coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Store owners can insert coupons" ON public.coupons FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update coupons" ON public.coupons FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete coupons" ON public.coupons FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Banners table
DROP POLICY IF EXISTS "Owners can manage their banners" ON public.banners;
CREATE POLICY "Store owners can select banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Store owners can insert banners" ON public.banners FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update banners" ON public.banners FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete banners" ON public.banners FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Delivery areas table
DROP POLICY IF EXISTS "Owners can manage their delivery areas" ON public.delivery_areas;
CREATE POLICY "Store owners can select delivery_areas" ON public.delivery_areas FOR SELECT USING (true);
CREATE POLICY "Store owners can insert delivery_areas" ON public.delivery_areas FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update delivery_areas" ON public.delivery_areas FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete delivery_areas" ON public.delivery_areas FOR DELETE USING (is_store_owner(auth.uid(), store_id));

-- Payment methods table
DROP POLICY IF EXISTS "Owners can manage their payment methods" ON public.payment_methods;
CREATE POLICY "Store owners can select payment_methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Store owners can insert payment_methods" ON public.payment_methods FOR INSERT WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can update payment_methods" ON public.payment_methods FOR UPDATE USING (is_store_owner(auth.uid(), store_id)) WITH CHECK (is_store_owner(auth.uid(), store_id));
CREATE POLICY "Store owners can delete payment_methods" ON public.payment_methods FOR DELETE USING (is_store_owner(auth.uid(), store_id));