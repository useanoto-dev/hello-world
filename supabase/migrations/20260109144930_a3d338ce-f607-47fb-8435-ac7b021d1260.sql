-- Adicionar campos de controle de estoque na tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_stock_control boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock_alert integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'un';

-- Criar índice para buscar produtos com controle de estoque
CREATE INDEX IF NOT EXISTS idx_products_has_stock_control ON public.products(has_stock_control) WHERE has_stock_control = true;