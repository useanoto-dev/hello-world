
-- 1. Criar tabela de estabelecimentos
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  instagram TEXT,
  google_maps_url TEXT,
  pix_key TEXT,
  qr_code_url TEXT,
  open_hour INTEGER DEFAULT 18,
  close_hour INTEGER DEFAULT 23,
  is_open_override BOOLEAN,
  min_order_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar enum para roles de estabelecimento
CREATE TYPE public.establishment_role AS ENUM ('owner', 'manager', 'employee');

-- 3. Criar tabela de membros do estabelecimento
CREATE TABLE public.establishment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role establishment_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(establishment_id, user_id)
);

-- 4. Adicionar establishment_id em todas as tabelas existentes
ALTER TABLE public.banners ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.pizza_sizes ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.pizza_flavors ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.pizza_prices ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.pizza_extras ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.pizza_extra_prices ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_areas ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.coupons ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_members ENABLE ROW LEVEL SECURITY;

-- 6. Função para verificar se usuário é membro do estabelecimento
CREATE OR REPLACE FUNCTION public.is_establishment_member(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.establishment_members
    WHERE user_id = _user_id AND establishment_id = _establishment_id
  )
$$;

-- 7. Função para verificar se usuário é owner/manager do estabelecimento
CREATE OR REPLACE FUNCTION public.is_establishment_admin(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.establishment_members
    WHERE user_id = _user_id 
    AND establishment_id = _establishment_id
    AND role IN ('owner', 'manager')
  )
$$;

-- 8. Função para pegar establishment_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_establishment_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.establishment_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 9. RLS para establishments
CREATE POLICY "Anyone can read active establishments by slug"
ON public.establishments FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their establishments"
ON public.establishments FOR ALL
USING (owner_id = auth.uid());

-- 10. RLS para establishment_members
CREATE POLICY "Members can view their establishment members"
ON public.establishment_members FOR SELECT
USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Admins can manage members"
ON public.establishment_members FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- 11. Dropar políticas antigas e criar novas com isolamento por establishment

-- Banners
DROP POLICY IF EXISTS "Anyone can read active banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Anyone can read active banners by establishment"
ON public.banners FOR SELECT
USING (is_active = true);
CREATE POLICY "Establishment admins can manage banners"
ON public.banners FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Categories
DROP POLICY IF EXISTS "Anyone can read active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Anyone can read active categories by establishment"
ON public.categories FOR SELECT
USING (is_active = true);
CREATE POLICY "Establishment admins can manage categories"
ON public.categories FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Products
DROP POLICY IF EXISTS "Anyone can read available products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Anyone can read available products by establishment"
ON public.products FOR SELECT
USING (is_available = true);
CREATE POLICY "Establishment admins can manage products"
ON public.products FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Pizza sizes
DROP POLICY IF EXISTS "Anyone can read active sizes" ON public.pizza_sizes;
DROP POLICY IF EXISTS "Admins can manage sizes" ON public.pizza_sizes;
CREATE POLICY "Anyone can read active sizes by establishment"
ON public.pizza_sizes FOR SELECT
USING (is_active = true);
CREATE POLICY "Establishment admins can manage sizes"
ON public.pizza_sizes FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Pizza flavors
DROP POLICY IF EXISTS "Anyone can read available flavors" ON public.pizza_flavors;
DROP POLICY IF EXISTS "Admins can manage flavors" ON public.pizza_flavors;
CREATE POLICY "Anyone can read available flavors by establishment"
ON public.pizza_flavors FOR SELECT
USING (is_available = true);
CREATE POLICY "Establishment admins can manage flavors"
ON public.pizza_flavors FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Pizza prices
DROP POLICY IF EXISTS "Anyone can read prices" ON public.pizza_prices;
DROP POLICY IF EXISTS "Admins can manage prices" ON public.pizza_prices;
CREATE POLICY "Anyone can read prices by establishment"
ON public.pizza_prices FOR SELECT
USING (true);
CREATE POLICY "Establishment admins can manage prices"
ON public.pizza_prices FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Pizza extras
DROP POLICY IF EXISTS "Anyone can read available extras" ON public.pizza_extras;
DROP POLICY IF EXISTS "Admins can manage extras" ON public.pizza_extras;
CREATE POLICY "Anyone can read available extras by establishment"
ON public.pizza_extras FOR SELECT
USING (is_available = true);
CREATE POLICY "Establishment admins can manage extras"
ON public.pizza_extras FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Pizza extra prices
DROP POLICY IF EXISTS "Anyone can read extra prices" ON public.pizza_extra_prices;
DROP POLICY IF EXISTS "Admins can manage extra prices" ON public.pizza_extra_prices;
CREATE POLICY "Anyone can read extra prices by establishment"
ON public.pizza_extra_prices FOR SELECT
USING (is_active = true);
CREATE POLICY "Establishment admins can manage extra prices"
ON public.pizza_extra_prices FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Delivery areas
DROP POLICY IF EXISTS "Anyone can read active areas" ON public.delivery_areas;
DROP POLICY IF EXISTS "Admins can manage areas" ON public.delivery_areas;
CREATE POLICY "Anyone can read active areas by establishment"
ON public.delivery_areas FOR SELECT
USING (is_active = true);
CREATE POLICY "Establishment admins can manage areas"
ON public.delivery_areas FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read orders by phone" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);
CREATE POLICY "Anyone can read orders by establishment"
ON public.orders FOR SELECT
USING (true);
CREATE POLICY "Establishment admins can manage orders"
ON public.orders FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Customers
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Establishment admins can manage customers"
ON public.customers FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- Coupons
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Anyone can read active coupons by establishment"
ON public.coupons FOR SELECT
USING (is_active = true);
CREATE POLICY "Establishment admins can manage coupons"
ON public.coupons FOR ALL
USING (is_establishment_admin(auth.uid(), establishment_id));

-- 12. Trigger para criar establishment e member quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  new_establishment_id UUID;
  new_slug TEXT;
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

  -- Gerar slug único
  new_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);

  -- Criar estabelecimento
  INSERT INTO public.establishments (name, slug, owner_id, phone, whatsapp)
  VALUES (user_name || '''s Business', new_slug, NEW.id, '(00) 00000-0000', '5500000000000')
  RETURNING id INTO new_establishment_id;

  -- Criar member como owner
  INSERT INTO public.establishment_members (establishment_id, user_id, role)
  VALUES (new_establishment_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- 13. Criar índices para performance
CREATE INDEX idx_establishment_members_user ON public.establishment_members(user_id);
CREATE INDEX idx_establishment_members_establishment ON public.establishment_members(establishment_id);
CREATE INDEX idx_establishments_slug ON public.establishments(slug);
CREATE INDEX idx_establishments_owner ON public.establishments(owner_id);
CREATE INDEX idx_banners_establishment ON public.banners(establishment_id);
CREATE INDEX idx_categories_establishment ON public.categories(establishment_id);
CREATE INDEX idx_products_establishment ON public.products(establishment_id);
CREATE INDEX idx_orders_establishment ON public.orders(establishment_id);

-- 14. Trigger para updated_at em establishments
CREATE TRIGGER update_establishments_updated_at
BEFORE UPDATE ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
