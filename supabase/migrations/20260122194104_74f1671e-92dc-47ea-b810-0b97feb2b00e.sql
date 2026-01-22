-- FASE 3: HARDENING - VIEWS PÚBLICAS SEGURAS (SIMPLIFICADAS)

-- 1. VIEW: Lojas públicas
DROP VIEW IF EXISTS public.v_public_stores;
CREATE VIEW public.v_public_stores AS
SELECT id, name, slug, logo_url, banner_url, primary_color, secondary_color,
  is_active, address, phone, whatsapp, instagram, about_us, google_maps_link,
  delivery_fee, min_order_value, estimated_delivery_time, estimated_prep_time,
  schedule, font_family, open_hour, close_hour, is_open_override, created_at
FROM stores WHERE is_active = true;
GRANT SELECT ON public.v_public_stores TO anon, authenticated;

-- 2. VIEW: Produtos públicos
DROP VIEW IF EXISTS public.v_public_products;
CREATE VIEW public.v_public_products AS
SELECT p.id, p.store_id, p.category_id, p.name, p.description, p.price,
  p.promotional_price, p.image_url, p.is_available, p.is_featured, p.display_order,
  c.name as category_name, c.slug as category_slug
FROM products p LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_available = true;
GRANT SELECT ON public.v_public_products TO anon, authenticated;

-- 3. VIEW: Reviews públicos (sem telefones)
DROP VIEW IF EXISTS public.v_public_reviews;
CREATE VIEW public.v_public_reviews AS
SELECT id, store_id,
  CASE WHEN length(customer_name) <= 3 THEN customer_name
    ELSE split_part(customer_name, ' ', 1) || 
         CASE WHEN array_length(string_to_array(customer_name, ' '), 1) > 1 
              THEN ' ' || left(split_part(customer_name, ' ', 2), 1) || '.' ELSE '' END
  END as customer_name,
  rating, feedback, created_at, store_response, response_at
FROM reviews;
GRANT SELECT ON public.v_public_reviews TO anon, authenticated;

-- 4. VIEW: Categorias públicas
DROP VIEW IF EXISTS public.v_public_categories;
CREATE VIEW public.v_public_categories AS
SELECT id, store_id, name, slug, description, image_url, icon, display_order,
  display_mode, category_type, is_active
FROM categories WHERE is_active = true;
GRANT SELECT ON public.v_public_categories TO anon, authenticated;

-- 5. VIEW: Banners públicos
DROP VIEW IF EXISTS public.v_public_banners;
CREATE VIEW public.v_public_banners AS
SELECT id, store_id, title, image_url, link_url, display_order, is_active
FROM banners WHERE is_active = true;
GRANT SELECT ON public.v_public_banners TO anon, authenticated;

-- 6. VIEW: Pedidos para tracking
DROP VIEW IF EXISTS public.v_order_tracking;
CREATE VIEW public.v_order_tracking AS
SELECT id, store_id, order_number, status, order_type, created_at, updated_at
FROM orders;
GRANT SELECT ON public.v_order_tracking TO anon, authenticated;

-- 7. VIEW: Cupons públicos
DROP VIEW IF EXISTS public.v_public_coupons;
CREATE VIEW public.v_public_coupons AS
SELECT id, store_id, code, discount_type, discount_value, min_order_value,
  valid_from, valid_until, max_uses, uses_count, is_active
FROM coupons WHERE is_active = true AND (valid_until IS NULL OR valid_until > now());
GRANT SELECT ON public.v_public_coupons TO anon, authenticated;

-- 8. VIEW: Sabores de pizza
DROP VIEW IF EXISTS public.v_public_pizza_flavors;
CREATE VIEW public.v_public_pizza_flavors AS
SELECT id, store_id, category_id, name, description, image_url, is_active, display_order
FROM pizza_flavors WHERE is_active = true;
GRANT SELECT ON public.v_public_pizza_flavors TO anon, authenticated;

-- 9. VIEW: Bordas de pizza (sem description/image)
DROP VIEW IF EXISTS public.v_public_pizza_edges;
CREATE VIEW public.v_public_pizza_edges AS
SELECT id, store_id, category_id, name, is_active, display_order
FROM pizza_edges WHERE is_active = true;
GRANT SELECT ON public.v_public_pizza_edges TO anon, authenticated;

-- 10. VIEW: Massas de pizza
DROP VIEW IF EXISTS public.v_public_pizza_doughs;
CREATE VIEW public.v_public_pizza_doughs AS
SELECT id, store_id, category_id, name, description, is_active, display_order
FROM pizza_doughs WHERE is_active = true;
GRANT SELECT ON public.v_public_pizza_doughs TO anon, authenticated;

-- 11. VIEW: Option groups
DROP VIEW IF EXISTS public.v_public_option_groups;
CREATE VIEW public.v_public_option_groups AS
SELECT id, category_id, store_id, name, selection_type, is_required,
  min_selections, max_selections, display_order, is_active
FROM category_option_groups WHERE is_active = true;
GRANT SELECT ON public.v_public_option_groups TO anon, authenticated;

-- 12. VIEW: Option items
DROP VIEW IF EXISTS public.v_public_option_items;
CREATE VIEW public.v_public_option_items AS
SELECT id, group_id, store_id, name, description, additional_price, image_url, display_order, is_active
FROM category_option_items WHERE is_active = true;
GRANT SELECT ON public.v_public_option_items TO anon, authenticated;

-- ===========================================
-- TABELA DE RATE LIMITING
-- ===========================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL, endpoint text NOT NULL,
  request_count integer DEFAULT 1, window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(), UNIQUE(key, endpoint)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;
CREATE POLICY "Service role manages rate limits" ON public.rate_limits FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, endpoint);

-- Função check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text, p_endpoint text, p_max_requests integer DEFAULT 100, p_window_seconds integer DEFAULT 60
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_record RECORD; v_now timestamptz := now();
  v_window_start timestamptz := v_now - (p_window_seconds || ' seconds')::interval;
BEGIN
  DELETE FROM rate_limits WHERE window_start < v_now - interval '1 hour';
  SELECT * INTO v_record FROM rate_limits WHERE key = p_key AND endpoint = p_endpoint FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, endpoint, request_count, window_start) VALUES (p_key, p_endpoint, 1, v_now);
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests - 1, 'current', 1);
  END IF;
  IF v_record.window_start < v_window_start THEN
    UPDATE rate_limits SET request_count = 1, window_start = v_now WHERE key = p_key AND endpoint = p_endpoint;
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests - 1, 'current', 1);
  END IF;
  IF v_record.request_count >= p_max_requests THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'current', v_record.request_count,
      'retry_after', EXTRACT(EPOCH FROM (v_record.window_start + (p_window_seconds || ' seconds')::interval - v_now))::integer);
  END IF;
  UPDATE rate_limits SET request_count = request_count + 1 WHERE key = p_key AND endpoint = p_endpoint;
  RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests - v_record.request_count - 1, 'current', v_record.request_count + 1);
END; $$;

-- ===========================================
-- TABELA DE PII ACCESS LOGS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.pii_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), accessed_at timestamptz DEFAULT now(),
  user_id uuid, staff_id uuid, store_id uuid, table_name text NOT NULL,
  record_id text, action text NOT NULL, ip_address text, user_agent text, justification text
);
ALTER TABLE public.pii_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners view pii logs" ON public.pii_access_logs;
CREATE POLICY "Owners view pii logs" ON public.pii_access_logs FOR SELECT
  USING (is_store_owner(auth.uid(), store_id) OR is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Service inserts pii logs" ON public.pii_access_logs;
CREATE POLICY "Service inserts pii logs" ON public.pii_access_logs FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_pii_logs_store ON pii_access_logs(store_id);

-- Função log_pii_access
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_table_name text, p_record_id text DEFAULT NULL, p_action text DEFAULT 'view',
  p_store_id uuid DEFAULT NULL, p_justification text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO pii_access_logs (user_id, store_id, table_name, record_id, action, justification)
  VALUES (auth.uid(), p_store_id, p_table_name, p_record_id, p_action, p_justification);
END; $$;