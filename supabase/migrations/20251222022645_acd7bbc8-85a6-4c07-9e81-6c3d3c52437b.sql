-- =============================================
-- CORREÇÃO: Remover view SECURITY DEFINER
-- e usar abordagem mais segura
-- =============================================

-- Remover a view problemática
DROP VIEW IF EXISTS public.public_restaurant_settings;

-- Manter a tabela restaurant_settings como está
-- O pix_key só será acessado durante o checkout
-- através da política existente que permite leitura pública