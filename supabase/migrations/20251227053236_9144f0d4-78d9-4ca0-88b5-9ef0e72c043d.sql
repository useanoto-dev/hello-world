-- Create cash register sessions table
CREATE TABLE public.cash_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  total_sales NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  cash_payments NUMERIC DEFAULT 0,
  card_payments NUMERIC DEFAULT 0,
  pix_payments NUMERIC DEFAULT 0,
  observations TEXT,
  opened_by UUID REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage cash register"
ON public.cash_register
FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Add payment_method column to orders if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'dinheiro';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_register(id);

-- Create customer rewards table
CREATE TABLE public.customer_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  pizza_count INTEGER DEFAULT 0,
  reward_earned BOOLEAN DEFAULT false,
  reward_used BOOLEAN DEFAULT false,
  reward_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_phone, month_year)
);

-- Enable RLS
ALTER TABLE public.customer_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for rewards
CREATE POLICY "Admins can manage rewards"
ON public.customer_rewards
FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Public can read own rewards"
ON public.customer_rewards
FOR SELECT
USING (true);

-- Create index for performance
CREATE INDEX idx_cash_register_status ON public.cash_register(status);
CREATE INDEX idx_cash_register_opened_at ON public.cash_register(opened_at);
CREATE INDEX idx_customer_rewards_phone ON public.customer_rewards(customer_phone);
CREATE INDEX idx_customer_rewards_month ON public.customer_rewards(month_year);