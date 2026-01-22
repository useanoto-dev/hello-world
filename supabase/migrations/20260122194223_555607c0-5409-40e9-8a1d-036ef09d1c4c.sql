-- Converter views para SECURITY INVOKER (padrão seguro)
-- As views já filtram dados sensíveis, então INVOKER é mais apropriado

ALTER VIEW public.v_public_stores SET (security_invoker = true);
ALTER VIEW public.v_public_products SET (security_invoker = true);
ALTER VIEW public.v_public_reviews SET (security_invoker = true);
ALTER VIEW public.v_public_categories SET (security_invoker = true);
ALTER VIEW public.v_public_banners SET (security_invoker = true);
ALTER VIEW public.v_order_tracking SET (security_invoker = true);
ALTER VIEW public.v_public_coupons SET (security_invoker = true);
ALTER VIEW public.v_public_pizza_flavors SET (security_invoker = true);
ALTER VIEW public.v_public_pizza_edges SET (security_invoker = true);
ALTER VIEW public.v_public_pizza_doughs SET (security_invoker = true);
ALTER VIEW public.v_public_option_groups SET (security_invoker = true);
ALTER VIEW public.v_public_option_items SET (security_invoker = true);

-- Corrigir política do rate_limits para ser mais restritiva
-- Rate limits são gerenciados apenas via Edge Functions (service role)
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;

-- Nenhum acesso direto via cliente - apenas service role pode acessar
-- (RLS é bypassado pelo service role automaticamente)

-- Corrigir política de pii_access_logs INSERT para ser mais restritiva
DROP POLICY IF EXISTS "Service inserts pii logs" ON public.pii_access_logs;

-- INSERT requer autenticação
CREATE POLICY "Authenticated can log pii access" ON public.pii_access_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);