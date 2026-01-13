-- Add WhatsApp integration fields to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS uazapi_instance_name text,
ADD COLUMN IF NOT EXISTS uazapi_instance_token text,
ADD COLUMN IF NOT EXISTS whatsapp_status text DEFAULT 'disconnected';

-- Add comment for documentation
COMMENT ON COLUMN public.stores.uazapi_instance_name IS 'Nome da instância Uazapi para WhatsApp';
COMMENT ON COLUMN public.stores.uazapi_instance_token IS 'Token da instância Uazapi para autenticação';
COMMENT ON COLUMN public.stores.whatsapp_status IS 'Status da conexão WhatsApp: disconnected, connecting, connected';