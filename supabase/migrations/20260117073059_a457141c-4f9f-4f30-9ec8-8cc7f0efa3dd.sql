-- Create upsell_modals table to manage upsell/cross-sell modals
CREATE TABLE public.upsell_modals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  target_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Deseja mais alguma coisa?',
  description TEXT DEFAULT 'Aproveite para completar seu pedido',
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_quick_add BOOLEAN NOT NULL DEFAULT true,
  max_products INTEGER DEFAULT 4,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upsell_modals ENABLE ROW LEVEL SECURITY;

-- Create policies using existing is_store_owner function
CREATE POLICY "Anyone can read active modals" 
ON public.upsell_modals 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage modals" 
ON public.upsell_modals 
FOR ALL 
USING (is_store_owner(auth.uid(), store_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_upsell_modals_updated_at
BEFORE UPDATE ON public.upsell_modals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();