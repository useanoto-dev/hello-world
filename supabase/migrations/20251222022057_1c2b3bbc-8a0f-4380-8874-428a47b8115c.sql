-- =============================================
-- CORREÇÃO DE SEGURANÇA: Tabela profiles
-- =============================================

-- Remover políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Criar políticas mais seguras para profiles
-- Apenas o próprio usuário pode ver seu perfil (ou admins)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR is_admin_or_manager(auth.uid())
);

-- Apenas o próprio usuário pode atualizar seu perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Apenas o próprio usuário pode inserir seu perfil
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- =============================================
-- CORREÇÃO DE SEGURANÇA: Tabela orders
-- =============================================

-- Remover políticas existentes da tabela orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Criar políticas mais seguras para orders
-- Apenas admins/managers podem ver pedidos (dados sensíveis de clientes)
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (is_admin_or_manager(auth.uid()));

-- Qualquer pessoa pode criar pedidos (necessário para o cardápio funcionar)
-- Mas não podem ver os dados de outros clientes
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Apenas admins/managers podem atualizar pedidos
CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (is_admin_or_manager(auth.uid()));

-- =============================================
-- CORREÇÃO DE SEGURANÇA: Tabela order_items
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- Criar políticas mais seguras para order_items
-- Apenas admins/managers podem ver itens de pedidos
CREATE POLICY "Admins can view all order items" 
ON public.order_items 
FOR SELECT 
USING (is_admin_or_manager(auth.uid()));

-- Qualquer pessoa pode criar itens de pedidos
CREATE POLICY "Anyone can create order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);

-- =============================================
-- CORREÇÃO DE SEGURANÇA: Tabela saved_customers
-- =============================================

-- Garantir que saved_customers só pode ser acessado por admins
DROP POLICY IF EXISTS "Admins can manage saved customers" ON public.saved_customers;
DROP POLICY IF EXISTS "Admins can view saved customers" ON public.saved_customers;

CREATE POLICY "Admins can manage saved customers" 
ON public.saved_customers 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));
