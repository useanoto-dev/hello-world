-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- Função para verificar se é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Policies para user_roles
CREATE POLICY "Super admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Atualizar policies de stores para super_admin ver todas
DROP POLICY IF EXISTS "Anyone can read active stores" ON public.stores;

CREATE POLICY "Anyone can read active stores or super admin all"
ON public.stores
FOR SELECT
USING (
  is_active = true 
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.store_id = stores.id
  )
);

-- Atualizar policies de profiles para super_admin ver todos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or super admin all"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() 
  OR public.is_super_admin(auth.uid())
);

-- Atualizar policies de orders para super_admin ver todos
DROP POLICY IF EXISTS "Anyone can read their orders" ON public.orders;

CREATE POLICY "Anyone can read their orders or super admin all"
ON public.orders
FOR SELECT
USING (
  true
  OR public.is_super_admin(auth.uid())
);

-- Atualizar policies de subscriptions para super_admin ver todas
DROP POLICY IF EXISTS "Owners can manage subscription" ON public.subscriptions;

CREATE POLICY "Owners or super admin can manage subscription"
ON public.subscriptions
FOR ALL
USING (
  is_store_owner(auth.uid(), store_id)
  OR public.is_super_admin(auth.uid())
);

-- Atualizar policies de customers para super_admin ver todos
DROP POLICY IF EXISTS "Anyone can read customers by phone" ON public.customers;

CREATE POLICY "Anyone can read customers or super admin all"
ON public.customers
FOR SELECT
USING (
  true
  OR public.is_super_admin(auth.uid())
);