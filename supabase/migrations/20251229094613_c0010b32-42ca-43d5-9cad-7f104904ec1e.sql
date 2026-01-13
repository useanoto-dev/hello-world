-- ============================================
-- MIGRAÇÃO: Simplificar banco para restaurante único
-- Remove estrutura multi-tenant e limpa tabelas
-- ============================================

-- 1. Remover triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_restaurant_info_updated_at ON public.restaurant_info;
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_pizza_flavors_updated_at ON public.pizza_flavors;
DROP TRIGGER IF EXISTS update_loyalty_cards_updated_at ON public.loyalty_cards;
DROP TRIGGER IF EXISTS update_printer_configs_updated_at ON public.printer_configs;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS set_tenant_id_banners ON public.banners;
DROP TRIGGER IF EXISTS set_tenant_id_categories ON public.categories;
DROP TRIGGER IF EXISTS set_tenant_id_products ON public.products;
DROP TRIGGER IF EXISTS set_tenant_id_delivery_areas ON public.delivery_areas;
DROP TRIGGER IF EXISTS set_tenant_id_orders ON public.orders;
DROP TRIGGER IF EXISTS set_tenant_id_customers ON public.customers;
DROP TRIGGER IF EXISTS set_tenant_id_coupons ON public.coupons;
DROP TRIGGER IF EXISTS set_tenant_id_pizza_flavors ON public.pizza_flavors;
DROP TRIGGER IF EXISTS set_tenant_id_pizza_sizes ON public.pizza_sizes;
DROP TRIGGER IF EXISTS set_tenant_id_pizza_prices ON public.pizza_prices;
DROP TRIGGER IF EXISTS set_tenant_id_pizza_extras ON public.pizza_extras;
DROP TRIGGER IF EXISTS set_tenant_id_pizza_extra_prices ON public.pizza_extra_prices;
DROP TRIGGER IF EXISTS set_tenant_id_cash_registers ON public.cash_registers;
DROP TRIGGER IF EXISTS set_tenant_id_loyalty_cards ON public.loyalty_cards;

-- 2. Dropar todas as tabelas (ordem correta para evitar erro de FK)
DROP TABLE IF EXISTS public.pizza_extra_prices CASCADE;
DROP TABLE IF EXISTS public.pizza_prices CASCADE;
DROP TABLE IF EXISTS public.pizza_extras CASCADE;
DROP TABLE IF EXISTS public.pizza_flavors CASCADE;
DROP TABLE IF EXISTS public.pizza_sizes CASCADE;
DROP TABLE IF EXISTS public.loyalty_cards CASCADE;
DROP TABLE IF EXISTS public.cash_registers CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.delivery_areas CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.printer_configs CASCADE;
DROP TABLE IF EXISTS public.restaurant_info CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 3. Dropar funções antigas
DROP FUNCTION IF EXISTS public.get_user_tenant_id();
DROP FUNCTION IF EXISTS public.set_tenant_id();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Manter funções úteis
-- has_role, is_admin_or_manager, is_super_admin já existem

-- ============================================
-- CRIAR NOVA ESTRUTURA SIMPLIFICADA
-- ============================================

-- Tabela de roles (obrigatória para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles (info adicional do usuário admin)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Informações do restaurante (único registro)
CREATE TABLE public.restaurant_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Pizzaria',
  slogan TEXT DEFAULT 'O melhor sabor da cidade',
  phone TEXT NOT NULL DEFAULT '(00) 00000-0000',
  whatsapp TEXT NOT NULL DEFAULT '5500000000000',
  address TEXT,
  instagram TEXT,
  google_maps_url TEXT,
  logo_url TEXT,
  banner_url TEXT,
  pix_key TEXT,
  qr_code_url TEXT,
  open_hour INTEGER DEFAULT 18,
  close_hour INTEGER DEFAULT 23,
  is_open_override BOOLEAN DEFAULT NULL,
  min_order_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurant_info ENABLE ROW LEVEL SECURITY;

-- Banners do carrossel
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Categorias do menu
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Tamanhos de pizza
CREATE TABLE public.pizza_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  max_flavors INTEGER DEFAULT 1,
  base_price NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pizza_sizes ENABLE ROW LEVEL SECURITY;

-- Sabores de pizza
CREATE TABLE public.pizza_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ingredients TEXT,
  category TEXT DEFAULT 'salgada', -- salgada, especial, doce
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pizza_flavors ENABLE ROW LEVEL SECURITY;

-- Preços por sabor/tamanho
CREATE TABLE public.pizza_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flavor_id UUID NOT NULL REFERENCES public.pizza_flavors(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flavor_id, size_id)
);
ALTER TABLE public.pizza_prices ENABLE ROW LEVEL SECURITY;

-- Extras de pizza (bordas, coberturas)
CREATE TABLE public.pizza_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- borda, cobertura
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pizza_extras ENABLE ROW LEVEL SECURITY;

-- Preços de extras por tamanho
CREATE TABLE public.pizza_extra_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extra_id UUID NOT NULL REFERENCES public.pizza_extras(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(extra_id, size_id)
);
ALTER TABLE public.pizza_extra_prices ENABLE ROW LEVEL SECURITY;

-- Produtos genéricos (bebidas, etc)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Áreas de entrega
CREATE TABLE public.delivery_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  delivery_fee NUMERIC DEFAULT 5.00,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 50,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Cupons de desconto
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage', -- percentage, fixed
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Clientes
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  address JSONB,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL, -- delivery, pickup, dine_in
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  address JSONB,
  payment_method TEXT,
  payment_change NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivered, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Simplificadas)
-- ============================================

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- restaurant_info
CREATE POLICY "Anyone can read restaurant info" ON public.restaurant_info
  FOR SELECT USING (true);

CREATE POLICY "Admins can update restaurant info" ON public.restaurant_info
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can insert restaurant info" ON public.restaurant_info
  FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- banners
CREATE POLICY "Anyone can read active banners" ON public.banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- categories
CREATE POLICY "Anyone can read active categories" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- pizza_sizes
CREATE POLICY "Anyone can read active sizes" ON public.pizza_sizes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage sizes" ON public.pizza_sizes
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- pizza_flavors
CREATE POLICY "Anyone can read available flavors" ON public.pizza_flavors
  FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage flavors" ON public.pizza_flavors
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- pizza_prices
CREATE POLICY "Anyone can read prices" ON public.pizza_prices
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage prices" ON public.pizza_prices
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- pizza_extras
CREATE POLICY "Anyone can read available extras" ON public.pizza_extras
  FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage extras" ON public.pizza_extras
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- pizza_extra_prices
CREATE POLICY "Anyone can read extra prices" ON public.pizza_extra_prices
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage extra prices" ON public.pizza_extra_prices
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- products
CREATE POLICY "Anyone can read available products" ON public.products
  FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- delivery_areas
CREATE POLICY "Anyone can read active areas" ON public.delivery_areas
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage areas" ON public.delivery_areas
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- coupons
CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- customers
CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- orders
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read orders by phone" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_restaurant_info_updated_at
  BEFORE UPDATE ON public.restaurant_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_pizza_flavors_updated_at
  BEFORE UPDATE ON public.pizza_flavors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- FUNÇÃO PARA CRIAR PERFIL DE NOVO USUÁRIO
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Extrair nome do usuário
  user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Criar profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, user_name);

  -- Criar role admin (primeiro usuário é admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- Trigger para novos usuários
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir info do restaurante (se não existir)
INSERT INTO public.restaurant_info (name, slogan, phone, whatsapp)
VALUES ('Minha Pizzaria', 'O melhor sabor da cidade', '(00) 00000-0000', '5500000000000')
ON CONFLICT DO NOTHING;

-- Inserir categorias básicas
INSERT INTO public.categories (name, slug, icon, display_order) VALUES
  ('Pizzas', 'pizzas', '🍕', 1),
  ('Bebidas', 'bebidas', '🥤', 2),
  ('Sobremesas', 'sobremesas', '🍰', 3),
  ('Combos', 'combos', '🎁', 4)
ON CONFLICT (slug) DO NOTHING;

-- Inserir tamanhos de pizza padrão
INSERT INTO public.pizza_sizes (name, slug, description, max_flavors, display_order) VALUES
  ('Broto', 'broto', '4 fatias - Ideal para 1 pessoa', 1, 1),
  ('Média', 'media', '6 fatias - Ideal para 2 pessoas', 2, 2),
  ('Grande', 'grande', '8 fatias - Ideal para 3-4 pessoas', 3, 3),
  ('Gigante', 'gigante', '12 fatias - Ideal para 4-5 pessoas', 4, 4)
ON CONFLICT (slug) DO NOTHING;