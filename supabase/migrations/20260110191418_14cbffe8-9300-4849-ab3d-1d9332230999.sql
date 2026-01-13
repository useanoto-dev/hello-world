-- Create table for WhatsApp message history per order
CREATE TABLE public.historico_whatsapp_pedido (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status_pedido TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enviado_por TEXT NOT NULL DEFAULT 'sistema'
);

-- Enable RLS
ALTER TABLE public.historico_whatsapp_pedido ENABLE ROW LEVEL SECURITY;

-- Store owners can manage history for their orders
CREATE POLICY "Store owners can manage whatsapp history"
ON public.historico_whatsapp_pedido
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = historico_whatsapp_pedido.pedido_id 
    AND is_store_owner(auth.uid(), o.store_id)
  )
);

-- Anyone can read history (for order tracking)
CREATE POLICY "Anyone can read whatsapp history"
ON public.historico_whatsapp_pedido
FOR SELECT
USING (true);

-- Service role can insert (for edge functions)
CREATE POLICY "Service can insert whatsapp history"
ON public.historico_whatsapp_pedido
FOR INSERT
WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX idx_historico_whatsapp_pedido_id ON public.historico_whatsapp_pedido(pedido_id);
CREATE INDEX idx_historico_whatsapp_status ON public.historico_whatsapp_pedido(status_pedido);