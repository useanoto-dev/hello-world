-- Adiciona campo para identificar o tipo de categoria (padrao ou pizza)
ALTER TABLE public.categories
ADD COLUMN category_type text DEFAULT 'padrao';

-- Adiciona comentário explicativo
COMMENT ON COLUMN public.categories.category_type IS 'Tipo da categoria: padrao ou pizza';