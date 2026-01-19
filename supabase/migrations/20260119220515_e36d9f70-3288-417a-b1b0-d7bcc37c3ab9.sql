-- Adicionar campos para suporte a PIX recorrente na tabela subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pix_invoice_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pix_qr_code_url TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pix_code TEXT;

-- Comentários para documentação
COMMENT ON COLUMN subscriptions.payment_method IS 'Método de pagamento: card, boleto ou pix';
COMMENT ON COLUMN subscriptions.pix_invoice_id IS 'ID da fatura PIX atual no Stripe';
COMMENT ON COLUMN subscriptions.pix_qr_code_url IS 'URL do QR Code PIX para exibir ao cliente';
COMMENT ON COLUMN subscriptions.pix_expires_at IS 'Data de expiração do QR Code PIX atual';
COMMENT ON COLUMN subscriptions.pix_code IS 'Código PIX copia e cola';