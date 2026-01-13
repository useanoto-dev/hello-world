-- Criar tabela intermediária para vincular extras a tamanhos com preços específicos
-- Isso permite que o mesmo extra tenha preços diferentes por tamanho de pizza

CREATE TABLE public.pizza_extras_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extra_id UUID NOT NULL REFERENCES public.pizza_extras(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.pizza_sizes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir que cada extra só aparece uma vez por tamanho
  UNIQUE(extra_id, size_id)
);

-- Habilitar RLS
ALTER TABLE public.pizza_extras_sizes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins can manage pizza extras sizes"
ON public.pizza_extras_sizes
FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Public can read active extras sizes"
ON public.pizza_extras_sizes
FOR SELECT
USING (is_active = true);

-- Índices para performance
CREATE INDEX idx_pizza_extras_sizes_extra_id ON public.pizza_extras_sizes(extra_id);
CREATE INDEX idx_pizza_extras_sizes_size_id ON public.pizza_extras_sizes(size_id);

-- Migrar dados existentes: criar entradas para cada combinação extra + tamanho ativo
-- Isso mantém compatibilidade com os extras já cadastrados
INSERT INTO public.pizza_extras_sizes (extra_id, size_id, price, is_active)
SELECT 
  e.id as extra_id,
  s.id as size_id,
  e.price as price,
  e.is_available as is_active
FROM public.pizza_extras e
CROSS JOIN public.pizza_sizes s
WHERE s.is_active = true;