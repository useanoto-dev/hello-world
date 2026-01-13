-- =============================================
-- CORREÇÃO DE SEGURANÇA: Tabela order_counter
-- Restringir leitura apenas para admins
-- =============================================

DROP POLICY IF EXISTS "Public can read order counter" ON public.order_counter;
DROP POLICY IF EXISTS "Admins can update order counter" ON public.order_counter;

-- Apenas admins podem ler o contador de pedidos
CREATE POLICY "Admins can read order counter" 
ON public.order_counter 
FOR SELECT 
USING (is_admin_or_manager(auth.uid()));

-- Apenas admins podem atualizar o contador
CREATE POLICY "Admins can update order counter" 
ON public.order_counter 
FOR UPDATE 
USING (is_admin_or_manager(auth.uid()));

-- =============================================
-- ATUALIZAÇÃO: Função generate_order_number
-- Usar SECURITY DEFINER para funcionar sem autenticação
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_number INTEGER;
BEGIN
  -- Atualiza e retorna o próximo número
  UPDATE public.order_counter
  SET last_order_number = last_order_number + 1,
      last_reset_date = CASE 
        WHEN last_reset_date < CURRENT_DATE THEN CURRENT_DATE 
        ELSE last_reset_date 
      END
  WHERE id = 1
  RETURNING last_order_number INTO new_order_number;
  
  RETURN new_order_number;
END;
$$;

-- =============================================
-- CORREÇÃO: Tabela restaurant_settings
-- Criar view pública sem dados sensíveis
-- =============================================

-- Criar view pública com apenas dados não-sensíveis
CREATE OR REPLACE VIEW public.public_restaurant_settings AS
SELECT 
  id,
  name,
  slogan,
  phone,
  whatsapp_number,
  instagram_url,
  google_maps_url,
  address,
  location,
  logo_url,
  banner_url,
  is_open_override,
  rating,
  num_reviews,
  open_hour,
  close_hour,
  min_order_value,
  default_delivery_fee,
  delivery_time_min,
  delivery_time_max
FROM public.restaurant_settings;

-- Dar acesso público à view
GRANT SELECT ON public.public_restaurant_settings TO anon, authenticated;

-- =============================================
-- CORREÇÃO: Tabela activity_log
-- Adicionar políticas explícitas de negação
-- =============================================

-- Já tem RLS habilitado e não permite UPDATE/DELETE por padrão
-- Verificar se as políticas estão corretas
DROP POLICY IF EXISTS "Admins can insert activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can view activity log" ON public.activity_log;

CREATE POLICY "Admins can insert activity log" 
ON public.activity_log 
FOR INSERT 
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can view activity log" 
ON public.activity_log 
FOR SELECT 
USING (is_admin_or_manager(auth.uid()));