-- Create tables (mesas) table
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  number VARCHAR(10) NOT NULL,
  name VARCHAR(50),
  capacity INT DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, number)
);

-- Add indexes for performance
CREATE INDEX idx_tables_store_id ON public.tables(store_id);
CREATE INDEX idx_tables_status ON public.tables(status);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can read active tables (for checkout), owners can manage
CREATE POLICY "Anyone can read active tables"
ON public.tables
FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage tables"
ON public.tables
FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Add table_id and order_source to orders table
ALTER TABLE public.orders 
ADD COLUMN table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
ADD COLUMN order_source VARCHAR(20) DEFAULT 'digital';

-- Add index for order_source filtering
CREATE INDEX idx_orders_order_source ON public.orders(order_source);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);

-- Create trigger to update table status automatically
CREATE OR REPLACE FUNCTION public.update_table_status_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- When a PDV order is created with a table_id, mark table as occupied
  IF TG_OP = 'INSERT' AND NEW.table_id IS NOT NULL AND NEW.order_source = 'pdv' THEN
    UPDATE public.tables SET status = 'occupied', updated_at = now() 
    WHERE id = NEW.table_id AND status = 'available';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_table_status
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_table_status_on_order();

-- Create trigger to update updated_at on tables
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();