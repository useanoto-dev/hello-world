-- =============================================
-- TABELAS ADMINISTRATIVAS ADICIONAIS
-- =============================================

-- 1. TABELA: profiles (Perfis de admin)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA: user_roles (Roles de usuário - separada por segurança)
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. TABELA: coupons (Cupons de desconto)
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA: saved_customers (Clientes com dados salvos)
CREATE TABLE public.saved_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address JSONB,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA: financial_summary (Resumo financeiro diário)
CREATE TABLE public.financial_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_delivery_fees DECIMAL(10,2) DEFAULT 0,
  total_discounts DECIMAL(10,2) DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABELA: activity_log (Log de atividades do admin)
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNÇÃO: Verificar role do usuário (SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin ou manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles - usuários podem ver/editar próprio perfil, admins podem ver todos
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User Roles - apenas admins podem gerenciar
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Coupons - admins podem gerenciar, leitura pública para validação
CREATE POLICY "Public can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Saved Customers - apenas admins
CREATE POLICY "Admins can view saved customers"
  ON public.saved_customers FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Public can insert saved customers"
  ON public.saved_customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update saved customers"
  ON public.saved_customers FOR UPDATE
  USING (true);

-- Financial Summary - apenas admins
CREATE POLICY "Admins can view financial summary"
  ON public.financial_summary FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can manage financial summary"
  ON public.financial_summary FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Activity Log - apenas admins
CREATE POLICY "Admins can view activity log"
  ON public.activity_log FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can insert activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- =============================================
-- POLICIES ADICIONAIS PARA TABELAS EXISTENTES (ADMIN CRUD)
-- =============================================

-- Restaurant Settings - admins podem editar
CREATE POLICY "Admins can update restaurant settings"
  ON public.restaurant_settings FOR UPDATE
  USING (public.is_admin_or_manager(auth.uid()));

-- Categories - admins podem gerenciar
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Products - admins podem gerenciar
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Pizza Sizes - admins podem gerenciar
CREATE POLICY "Admins can manage pizza sizes"
  ON public.pizza_sizes FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Pizza Flavors - admins podem gerenciar
CREATE POLICY "Admins can manage pizza flavors"
  ON public.pizza_flavors FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Pizza Flavor Prices - admins podem gerenciar
CREATE POLICY "Admins can manage flavor prices"
  ON public.pizza_flavor_prices FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Pizza Extras - admins podem gerenciar
CREATE POLICY "Admins can manage pizza extras"
  ON public.pizza_extras FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Neighborhoods - admins podem gerenciar
CREATE POLICY "Admins can manage neighborhoods"
  ON public.neighborhoods FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Orders - admins podem ver e atualizar todos
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin_or_manager(auth.uid()));

-- Order Items - admins podem ver todos
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

-- =============================================
-- TRIGGER: Criar perfil automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_customers_updated_at
  BEFORE UPDATE ON public.saved_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNÇÃO: Atualizar resumo financeiro
-- =============================================
CREATE OR REPLACE FUNCTION public.update_financial_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_date DATE;
BEGIN
  order_date := DATE(COALESCE(NEW.created_at, OLD.created_at));
  
  INSERT INTO public.financial_summary (date, total_orders, total_revenue, total_delivery_fees, total_discounts, cancelled_orders)
  SELECT 
    order_date,
    COUNT(*) FILTER (WHERE status != 'cancelled'),
    COALESCE(SUM(total_amount) FILTER (WHERE status != 'cancelled'), 0),
    COALESCE(SUM(delivery_fee) FILTER (WHERE status != 'cancelled'), 0),
    COALESCE(SUM(discount) FILTER (WHERE status != 'cancelled'), 0),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  FROM public.orders
  WHERE DATE(created_at) = order_date
  ON CONFLICT (date) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    total_delivery_fees = EXCLUDED.total_delivery_fees,
    total_discounts = EXCLUDED.total_discounts,
    cancelled_orders = EXCLUDED.cancelled_orders,
    avg_order_value = CASE WHEN EXCLUDED.total_orders > 0 
      THEN EXCLUDED.total_revenue / EXCLUDED.total_orders 
      ELSE 0 END,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_financial_on_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_summary();

-- =============================================
-- FUNÇÃO: Atualizar dados do cliente salvo
-- =============================================
CREATE OR REPLACE FUNCTION public.update_saved_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != 'cancelled' THEN
    INSERT INTO public.saved_customers (phone, name, total_orders, total_spent, last_order_at, address)
    VALUES (
      NEW.customer_phone,
      NEW.customer_name,
      1,
      NEW.total_amount,
      NEW.created_at,
      NEW.address
    )
    ON CONFLICT (phone) DO UPDATE SET
      name = EXCLUDED.name,
      total_orders = saved_customers.total_orders + 1,
      total_spent = saved_customers.total_spent + EXCLUDED.total_spent,
      last_order_at = EXCLUDED.last_order_at,
      address = COALESCE(EXCLUDED.address, saved_customers.address),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_customer_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_saved_customer_stats();

-- Enable realtime para novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_customers;