-- Create table for automatic WhatsApp messages
CREATE TABLE public.mensagens_automaticas_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status_pedido TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mensagens_automaticas_whatsapp ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their messages
CREATE POLICY "Store owners can manage automatic messages"
ON public.mensagens_automaticas_whatsapp
FOR ALL
USING (is_store_owner(auth.uid(), restaurant_id));

-- Anyone can read active messages (for edge functions)
CREATE POLICY "Anyone can read active automatic messages"
ON public.mensagens_automaticas_whatsapp
FOR SELECT
USING (ativo = true);

-- Create index for faster lookups
CREATE INDEX idx_mensagens_automaticas_restaurant_status 
ON public.mensagens_automaticas_whatsapp(restaurant_id, status_pedido);

-- Create trigger for updated_at
CREATE TRIGGER update_mensagens_automaticas_updated_at
BEFORE UPDATE ON public.mensagens_automaticas_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();