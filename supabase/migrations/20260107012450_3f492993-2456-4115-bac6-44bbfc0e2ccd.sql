-- Create table for customizable WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📝',
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, template_key)
);

-- Create table for WhatsApp message history
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  template_key TEXT NOT NULL,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_templates
CREATE POLICY "Store owners can manage their templates"
ON public.whatsapp_templates
FOR ALL
USING (public.is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store users can view templates"
ON public.whatsapp_templates
FOR SELECT
USING (store_id = public.get_user_store_id(auth.uid()));

-- RLS policies for whatsapp_messages
CREATE POLICY "Store owners can manage messages"
ON public.whatsapp_messages
FOR ALL
USING (public.is_store_owner(auth.uid(), store_id));

CREATE POLICY "Store users can view and insert messages"
ON public.whatsapp_messages
FOR SELECT
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Store users can insert messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

-- Create indexes
CREATE INDEX idx_whatsapp_templates_store_id ON public.whatsapp_templates(store_id);
CREATE INDEX idx_whatsapp_messages_store_id ON public.whatsapp_messages(store_id);
CREATE INDEX idx_whatsapp_messages_customer_id ON public.whatsapp_messages(customer_id);
CREATE INDEX idx_whatsapp_messages_sent_at ON public.whatsapp_messages(sent_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();