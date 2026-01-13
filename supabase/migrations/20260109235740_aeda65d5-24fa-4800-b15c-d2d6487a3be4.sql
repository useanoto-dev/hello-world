-- Create table for WhatsApp instances per store
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  instance_token TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_connected TEXT,
  qr_code TEXT,
  qr_code_expires_at TIMESTAMP WITH TIME ZONE,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Create policies for store owners
CREATE POLICY "Store owners can view their WhatsApp instance"
  ON public.whatsapp_instances
  FOR SELECT
  USING (store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Store owners can create their WhatsApp instance"
  ON public.whatsapp_instances
  FOR INSERT
  WITH CHECK (store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Store owners can update their WhatsApp instance"
  ON public.whatsapp_instances
  FOR UPDATE
  USING (store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Store owners can delete their WhatsApp instance"
  ON public.whatsapp_instances
  FOR DELETE
  USING (store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();