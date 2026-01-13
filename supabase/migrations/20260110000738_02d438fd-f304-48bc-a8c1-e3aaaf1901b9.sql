-- Add delivery and read status columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS message_id TEXT,
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_store_sent 
ON public.whatsapp_messages(store_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order 
ON public.whatsapp_messages(order_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id 
ON public.whatsapp_messages(message_id);

-- Add comment for documentation
COMMENT ON COLUMN public.whatsapp_messages.message_type IS 'Type: order_confirmation, status_update, manual, promo';
COMMENT ON COLUMN public.whatsapp_messages.status IS 'Status: pending, sent, delivered, read, failed';