-- Corrigir políticas RLS para permitir acesso público ao cardápio

-- 1. STORES - Permitir leitura pública de lojas ativas
DROP POLICY IF EXISTS "Anyone can read active stores" ON public.stores;
CREATE POLICY "Anyone can read active stores" 
ON public.stores 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 2. CATEGORIES - Permitir leitura pública de categorias ativas
DROP POLICY IF EXISTS "Anyone can read active categories" ON public.categories;
CREATE POLICY "Anyone can read active categories" 
ON public.categories 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 3. PRODUCTS - Permitir leitura pública de produtos disponíveis
DROP POLICY IF EXISTS "Anyone can read available products" ON public.products;
CREATE POLICY "Anyone can read available products" 
ON public.products 
FOR SELECT 
TO anon, authenticated
USING (is_available = true);

-- 4. BANNERS - Permitir leitura pública de banners ativos
DROP POLICY IF EXISTS "Anyone can read active banners" ON public.banners;
CREATE POLICY "Anyone can read active banners" 
ON public.banners 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 5. PIZZA_SIZES - Permitir leitura pública
DROP POLICY IF EXISTS "Anyone can read active pizza sizes" ON public.pizza_sizes;
CREATE POLICY "Anyone can read active pizza sizes" 
ON public.pizza_sizes 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 6. PIZZA_FLAVORS - Permitir leitura pública
DROP POLICY IF EXISTS "Anyone can read active pizza flavors" ON public.pizza_flavors;
CREATE POLICY "Anyone can read active pizza flavors" 
ON public.pizza_flavors 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 7. PIZZA_BORDERS - Permitir leitura pública
DROP POLICY IF EXISTS "Anyone can read active pizza borders" ON public.pizza_borders;
CREATE POLICY "Anyone can read active pizza borders" 
ON public.pizza_borders 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 8. PIZZA_TOPPINGS - Permitir leitura pública
DROP POLICY IF EXISTS "Anyone can read active pizza toppings" ON public.pizza_toppings;
CREATE POLICY "Anyone can read active pizza toppings" 
ON public.pizza_toppings 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 9. COUPONS - Permitir leitura pública de cupons ativos
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
CREATE POLICY "Anyone can read active coupons" 
ON public.coupons 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);