-- Tabela de transações financeiras (entradas e saídas)
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  payment_method TEXT,
  reference_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_financial_transactions_store_id ON public.financial_transactions(store_id);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_reference_date ON public.financial_transactions(reference_date);
CREATE INDEX idx_financial_transactions_category ON public.financial_transactions(category);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their store financial transactions" 
ON public.financial_transactions 
FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create financial transactions for their store" 
ON public.financial_transactions 
FOR INSERT 
WITH CHECK (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their store financial transactions" 
ON public.financial_transactions 
FOR UPDATE 
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their store financial transactions" 
ON public.financial_transactions 
FOR DELETE 
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de categorias financeiras personalizadas
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categorias
CREATE POLICY "Users can view their store financial categories" 
ON public.financial_categories 
FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage their store financial categories" 
ON public.financial_categories 
FOR ALL 
USING (
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);