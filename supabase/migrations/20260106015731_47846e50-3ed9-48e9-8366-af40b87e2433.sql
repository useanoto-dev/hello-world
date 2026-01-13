-- Create table_reservations table
CREATE TABLE public.table_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_table_reservations_store_date ON public.table_reservations(store_id, reservation_date);
CREATE INDEX idx_table_reservations_table_date ON public.table_reservations(table_id, reservation_date);

-- Enable RLS
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can create reservations" 
ON public.table_reservations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read reservations" 
ON public.table_reservations 
FOR SELECT 
USING (true);

CREATE POLICY "Owners can manage reservations" 
ON public.table_reservations 
FOR ALL 
USING (is_store_owner(auth.uid(), store_id));

-- Trigger for updated_at
CREATE TRIGGER update_table_reservations_updated_at
BEFORE UPDATE ON public.table_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();