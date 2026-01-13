-- =============================================
-- RESET COMPLETO - ANOTÔ CARDÁPIO DIGITAL SAAS
-- =============================================

-- Remover triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover funções existentes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_establishment_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_establishment_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_manager(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_establishment_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(uuid) CASCADE;

-- Remover tabelas existentes (ordem correta para evitar erros de FK)
DROP TABLE IF EXISTS public.pizza_extra_prices CASCADE;
DROP TABLE IF EXISTS public.pizza_extras CASCADE;
DROP TABLE IF EXISTS public.pizza_prices CASCADE;
DROP TABLE IF EXISTS public.pizza_flavors CASCADE;
DROP TABLE IF EXISTS public.pizza_sizes CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.delivery_areas CASCADE;
DROP TABLE IF EXISTS public.establishment_members CASCADE;
DROP TABLE IF EXISTS public.establishments CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.restaurant_info CASCADE;

-- Remover tipos enum existentes
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.establishment_role CASCADE;

-- =============================================
-- CRIAR NOVA ESTRUTURA - ANOTÔ SAAS
-- =============================================

-- Enum para status de assinatura
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'past_due', 'canceled', 'unpaid');

-- =============================================
-- TABELA: stores (Lojas/Estabelecimentos)
-- =============================================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#dc2626',
  secondary_color TEXT DEFAULT '#f97316',
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  instagram TEXT,
  open_hour INTEGER DEFAULT 8,
  close_hour INTEGER DEFAULT 22,
  is_open_override BOOLEAN,
  min_order_value NUMERIC DEFAULT 0,
  pix_key TEXT,
  delivery_fee NUMERIC DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABELA: profiles (Perfis de usuário)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABELA: subscriptions (Assinaturas)
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status subscription_status DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);

-- =============================================
-- TABELA: categories (Categorias)
-- =============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABELA: products (Produtos)
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  promotional_price NUMERIC,
  image_url TEXT,
  images JSONB DEFAULT '[]',
  variations JSONB DEFAULT '[]', -- [{name: "Tamanho", options: [{name: "P", price: 0}, {name: "M", price: 5}]}]
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABELA: banners
-- =============================================
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABELA: orders (Pedidos)
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  order_type TEXT NOT NULL, -- delivery, pickup, dine_in
  address JSONB,
  payment_method TEXT,
  payment_change NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivering, completed, canceled
  paid BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABELA: coupons (Cupons)
-- =============================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage', -- percentage, fixed
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Função para verificar se é dono da loja
CREATE OR REPLACE FUNCTION public.is_store_owner(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND store_id = _store_id 
    AND is_owner = true
  )
$$;

-- Função para pegar store_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- =============================================
-- TRIGGER: handle_new_user (criar perfil automaticamente)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGERS para updated_at
-- =============================================
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- STORES: Leitura pública, escrita apenas para dono
CREATE POLICY "Anyone can read active stores" ON public.stores FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage their store" ON public.stores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND store_id = stores.id AND is_owner = true)
);

-- PROFILES: Usuário pode ver/editar próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- SUBSCRIPTIONS: Apenas dono pode ver/gerenciar
CREATE POLICY "Owners can manage subscription" ON public.subscriptions FOR ALL USING (
  is_store_owner(auth.uid(), store_id)
);

-- CATEGORIES: Leitura pública por loja, escrita apenas dono
CREATE POLICY "Anyone can read active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage categories" ON public.categories FOR ALL USING (
  is_store_owner(auth.uid(), store_id)
);

-- PRODUCTS: Leitura pública, escrita apenas dono
CREATE POLICY "Anyone can read available products" ON public.products FOR SELECT USING (is_available = true);
CREATE POLICY "Owners can manage products" ON public.products FOR ALL USING (
  is_store_owner(auth.uid(), store_id)
);

-- BANNERS: Leitura pública, escrita apenas dono
CREATE POLICY "Anyone can read active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage banners" ON public.banners FOR ALL USING (
  is_store_owner(auth.uid(), store_id)
);

-- ORDERS: Cliente pode criar, dono pode gerenciar
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read their orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Owners can manage orders" ON public.orders FOR ALL USING (
  is_store_owner(auth.uid(), store_id)
);

-- COUPONS: Leitura pública (ativos), escrita apenas dono
CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage coupons" ON public.coupons FOR ALL USING (
  is_store_owner(auth.uid(), store_id)
);

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_profiles_store_id ON public.profiles(store_id);
CREATE INDEX idx_categories_store_id ON public.categories(store_id);
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_orders_store_id ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_banners_store_id ON public.banners(store_id);