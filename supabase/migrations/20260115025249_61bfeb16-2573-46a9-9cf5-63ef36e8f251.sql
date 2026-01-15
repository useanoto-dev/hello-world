-- ===========================================
-- SISTEMA DE CONTROLE DE ACESSO E AUDITORIA
-- ===========================================

-- 1. Tabela de funcionários da loja
CREATE TABLE public.store_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'garcom', 'caixa')),
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.store_staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(store_id, cpf)
);

-- 2. Permissões configuráveis para caixa
CREATE TABLE public.staff_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.store_staff(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  can_open_cashier BOOLEAN NOT NULL DEFAULT false,
  can_close_cashier BOOLEAN NOT NULL DEFAULT false,
  can_cancel_orders BOOLEAN NOT NULL DEFAULT false,
  can_apply_discounts BOOLEAN NOT NULL DEFAULT false,
  can_view_reports BOOLEAN NOT NULL DEFAULT false,
  can_finalize_sales BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id)
);

-- 3. Códigos de acesso temporário
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.store_staff(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.store_staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.store_staff(id),
  staff_name TEXT,
  staff_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Índices para performance
CREATE INDEX idx_store_staff_store_id ON public.store_staff(store_id);
CREATE INDEX idx_store_staff_cpf ON public.store_staff(cpf);
CREATE INDEX idx_store_staff_role ON public.store_staff(role);
CREATE INDEX idx_store_staff_active ON public.store_staff(is_active, is_deleted);
CREATE INDEX idx_staff_permissions_staff_id ON public.staff_permissions(staff_id);
CREATE INDEX idx_access_codes_staff_id ON public.access_codes(staff_id);
CREATE INDEX idx_access_codes_code ON public.access_codes(code);
CREATE INDEX idx_audit_logs_store_id ON public.audit_logs(store_id);
CREATE INDEX idx_audit_logs_staff_id ON public.audit_logs(staff_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_module ON public.audit_logs(module);

-- 6. Habilitar RLS
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para store_staff
CREATE POLICY "Store owners can manage their staff"
ON public.store_staff
FOR ALL
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 8. Políticas RLS para staff_permissions
CREATE POLICY "Store owners can manage staff permissions"
ON public.staff_permissions
FOR ALL
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 9. Políticas RLS para access_codes
CREATE POLICY "Store owners can manage access codes"
ON public.access_codes
FOR ALL
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 10. Políticas RLS para audit_logs
CREATE POLICY "Store owners can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- 11. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 12. Triggers para updated_at
CREATE TRIGGER update_store_staff_updated_at
BEFORE UPDATE ON public.store_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_staff_updated_at();

CREATE TRIGGER update_staff_permissions_updated_at
BEFORE UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_staff_updated_at();

-- 13. Função para gerar código de acesso temporário
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 14. Função para criar permissões padrão ao criar caixa
CREATE OR REPLACE FUNCTION public.create_default_cashier_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'caixa' THEN
    INSERT INTO public.staff_permissions (staff_id, store_id)
    VALUES (NEW.id, NEW.store_id)
    ON CONFLICT (staff_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER create_cashier_permissions_trigger
AFTER INSERT ON public.store_staff
FOR EACH ROW
EXECUTE FUNCTION public.create_default_cashier_permissions();

-- 15. Adicionar coluna staff_id na tabela orders para vincular pedidos ao garçom
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.store_staff(id);