-- Tabela de categorias de estoque
CREATE TABLE public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de produtos com estoque
CREATE TABLE public.inventory_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  promotional_price NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 5,
  unit TEXT DEFAULT 'un',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de movimentações de estoque
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste', 'venda')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  order_id UUID,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para inventory_categories
CREATE POLICY "Anyone can read active inventory categories"
ON public.inventory_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage inventory categories"
ON public.inventory_categories FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Políticas para inventory_products
CREATE POLICY "Anyone can read active inventory products"
ON public.inventory_products FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage inventory products"
ON public.inventory_products FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Políticas para inventory_movements
CREATE POLICY "Anyone can read inventory movements"
ON public.inventory_movements FOR SELECT
USING (true);

CREATE POLICY "Owners can manage inventory movements"
ON public.inventory_movements FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Trigger para updated_at
CREATE TRIGGER update_inventory_products_updated_at
BEFORE UPDATE ON public.inventory_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Índices para performance
CREATE INDEX idx_inventory_categories_store ON public.inventory_categories(store_id);
CREATE INDEX idx_inventory_products_store ON public.inventory_products(store_id);
CREATE INDEX idx_inventory_products_category ON public.inventory_products(category_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_store ON public.inventory_movements(store_id);