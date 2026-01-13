-- Criar tabela de banners para o cardápio
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública de banners ativos
CREATE POLICY "Public can read active banners"
ON public.banners
FOR SELECT
USING (is_active = true);

-- Policy para admins gerenciarem banners
CREATE POLICY "Admins can manage banners"
ON public.banners
FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();