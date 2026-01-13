-- Tabela para registrar campanhas de disparo WhatsApp
CREATE TABLE public.whatsapp_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_content TEXT NOT NULL,
  
  -- Filtros aplicados (JSON com os filtros selecionados)
  filters JSONB DEFAULT '{}',
  
  -- Status da campanha: draft, sending, completed, failed, cancelled
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Estatísticas
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de destinatários individuais da campanha
CREATE TABLE public.whatsapp_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  
  -- Status individual: pending, sent, failed
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_campaigns_store_id ON public.whatsapp_campaigns(store_id);
CREATE INDEX idx_whatsapp_campaigns_status ON public.whatsapp_campaigns(status);
CREATE INDEX idx_whatsapp_campaign_recipients_campaign_id ON public.whatsapp_campaign_recipients(campaign_id);
CREATE INDEX idx_whatsapp_campaign_recipients_status ON public.whatsapp_campaign_recipients(status);

-- Enable RLS
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_campaigns
CREATE POLICY "Store owners can view their campaigns"
ON public.whatsapp_campaigns
FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Store owners can create campaigns"
ON public.whatsapp_campaigns
FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Store owners can update their campaigns"
ON public.whatsapp_campaigns
FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Store owners can delete their campaigns"
ON public.whatsapp_campaigns
FOR DELETE
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policies para whatsapp_campaign_recipients
CREATE POLICY "Store owners can view campaign recipients"
ON public.whatsapp_campaign_recipients
FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns 
    WHERE store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Store owners can create campaign recipients"
ON public.whatsapp_campaign_recipients
FOR INSERT
WITH CHECK (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns 
    WHERE store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Store owners can update campaign recipients"
ON public.whatsapp_campaign_recipients
FOR UPDATE
USING (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns 
    WHERE store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Store owners can delete campaign recipients"
ON public.whatsapp_campaign_recipients
FOR DELETE
USING (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns 
    WHERE store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);