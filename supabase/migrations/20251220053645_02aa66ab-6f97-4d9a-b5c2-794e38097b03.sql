-- =============================================
-- PIZZARIA PORTUGUESA - DATABASE SCHEMA
-- =============================================

-- 1. ENUM para tipos de serviço e status
CREATE TYPE public.service_type AS ENUM ('delivery', 'pickup', 'dine_in');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro');

-- =============================================
-- 2. TABELA: restaurant_settings (Configurações do restaurante)
-- =============================================
CREATE TABLE public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Pizzaria Portuguesa',
  slogan TEXT DEFAULT 'O sabor incomparável',
  phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  instagram_url TEXT,
  google_maps_url TEXT,
  address TEXT,
  location TEXT,
  logo_url TEXT,
  banner_url TEXT,
  pix_key TEXT,
  qr_code_image TEXT,
  rating DECIMAL(2,1) DEFAULT 4.8,
  num_reviews INTEGER DEFAULT 0,
  open_hour INTEGER DEFAULT 18,
  close_hour INTEGER DEFAULT 23,
  min_order_value DECIMAL(10,2) DEFAULT 10.00,
  default_delivery_fee DECIMAL(10,2) DEFAULT 5.00,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 50,
  is_open_override BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. TABELA: categories (Categorias do cardápio)
-- =============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. TABELA: products (Produtos gerais - bebidas, etc.)
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  sub_category TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 5. TABELA: pizza_sizes (Tamanhos de pizza)
-- =============================================
CREATE TABLE public.pizza_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  max_flavors INTEGER DEFAULT 2,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. TABELA: pizza_flavors (Sabores de pizza)
-- =============================================
CREATE TABLE public.pizza_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ingredients TEXT,
  category TEXT DEFAULT 'salgada',
  is_premium BOOLEAN DEFAULT false,
  surcharge DECIMAL(10,2) DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. TABELA: pizza_flavor_prices (Preços por tamanho)
-- =============================================
CREATE TABLE public.pizza_flavor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flavor_id UUID REFERENCES public.pizza_flavors(id) ON DELETE CASCADE NOT NULL,
  size_id UUID REFERENCES public.pizza_sizes(id) ON DELETE CASCADE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  UNIQUE(flavor_id, size_id)
);

-- =============================================
-- 8. TABELA: pizza_extras (Bordas, coberturas, etc.)
-- =============================================
CREATE TABLE public.pizza_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'border' ou 'topping'
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 9. TABELA: neighborhoods (Bairros de entrega)
-- =============================================
CREATE TABLE public.neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 10. TABELA: orders (Pedidos)
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_type public.service_type NOT NULL,
  address JSONB,
  table_number TEXT,
  payment_method public.payment_method NOT NULL,
  change_amount DECIMAL(10,2),
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  observations TEXT,
  status public.order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 11. TABELA: order_items (Itens dos pedidos)
-- =============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  size TEXT,
  flavors JSONB,
  extras JSONB,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 12. TABELA: order_counter (Contador de pedidos)
-- =============================================
CREATE TABLE public.order_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_order_number INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial counter row
INSERT INTO public.order_counter (id, last_order_number) VALUES (1, 0);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_flavor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizza_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_counter ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Tabelas públicas (SELECT para todos)
-- =============================================

-- Restaurant Settings - Leitura pública
CREATE POLICY "Public can read restaurant settings"
  ON public.restaurant_settings FOR SELECT
  USING (true);

-- Categories - Leitura pública
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- Products - Leitura pública
CREATE POLICY "Public can read available products"
  ON public.products FOR SELECT
  USING (is_available = true);

-- Pizza Sizes - Leitura pública
CREATE POLICY "Public can read pizza sizes"
  ON public.pizza_sizes FOR SELECT
  USING (is_active = true);

-- Pizza Flavors - Leitura pública
CREATE POLICY "Public can read available flavors"
  ON public.pizza_flavors FOR SELECT
  USING (is_available = true);

-- Pizza Flavor Prices - Leitura pública
CREATE POLICY "Public can read flavor prices"
  ON public.pizza_flavor_prices FOR SELECT
  USING (true);

-- Pizza Extras - Leitura pública
CREATE POLICY "Public can read available extras"
  ON public.pizza_extras FOR SELECT
  USING (is_available = true);

-- Neighborhoods - Leitura pública
CREATE POLICY "Public can read active neighborhoods"
  ON public.neighborhoods FOR SELECT
  USING (is_active = true);

-- Orders - Inserção pública (cliente pode criar pedido)
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Order Items - Inserção pública
CREATE POLICY "Public can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

-- Order Counter - Leitura e atualização para funções
CREATE POLICY "Public can read order counter"
  ON public.order_counter FOR SELECT
  USING (true);

CREATE POLICY "Public can update order counter"
  ON public.order_counter FOR UPDATE
  USING (true);

-- =============================================
-- FUNÇÃO: Gerar número do pedido
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_number INTEGER;
BEGIN
  -- Atualiza e retorna o próximo número
  UPDATE public.order_counter
  SET last_order_number = last_order_number + 1,
      last_reset_date = CASE 
        WHEN last_reset_date < CURRENT_DATE THEN CURRENT_DATE 
        ELSE last_reset_date 
      END
  WHERE id = 1
  RETURNING last_order_number INTO new_order_number;
  
  RETURN new_order_number;
END;
$$;

-- =============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_restaurant_settings_updated_at
  BEFORE UPDATE ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pizza_flavors_updated_at
  BEFORE UPDATE ON public.pizza_flavors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Configurações do restaurante
INSERT INTO public.restaurant_settings (
  name, slogan, phone, whatsapp_number, instagram_url, google_maps_url,
  address, location, logo_url, banner_url, pix_key, qr_code_image,
  rating, num_reviews, open_hour, close_hour, min_order_value
) VALUES (
  'Pizzaria Portuguesa',
  'O sabor incomparável',
  '5599988393652',
  '5599988393652',
  'https://www.instagram.com/pizzariaportuguesaofc/',
  'https://share.google/YX6zwujcDgpRoFL9V',
  'Rua Abílio Monteiro, 1519 - Engenho, Pedreiras - MA',
  'Pedreiras - MA',
  'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/logo-pizzaria.webp',
  'https://pizzariaportuguesa.site/wp-content/uploads/2025/07/home-P.-PORTUGUESA.webp',
  '99991297042',
  'https://pizzariaportuguesa.site/wp-content/uploads/2025/08/pagamento.webp',
  4.8, 427, 18, 23, 10.00
);

-- Categorias
INSERT INTO public.categories (name, slug, icon, display_order) VALUES
  ('Pizzas', 'pizzas', '🍕', 1),
  ('Bebidas', 'bebidas', '🥤', 2),
  ('Localização', 'localizacao', '📍', 3),
  ('Sobre Nós', 'sobre_nos', 'ℹ️', 4);

-- Tamanhos de pizza
INSERT INTO public.pizza_sizes (name, slug, max_flavors, display_order) VALUES
  ('Brotinho', 'brotinho', 2, 1),
  ('Pizza Pequena', 'pequena', 2, 2),
  ('Pizza Média', 'media', 2, 3),
  ('Pizza Grande', 'grande', 3, 4),
  ('Pizza Família', 'familia', 3, 5);

-- Sabores de pizza (tradicionais)
INSERT INTO public.pizza_flavors (name, ingredients, category, is_premium, display_order) VALUES
  ('Mussarela', 'molho de tomate e mussarela', 'salgada', false, 1),
  ('Marguerita', 'molho de tomate, mussarela, tomate e manjericão', 'salgada', false, 2),
  ('Portuguesa', 'molho de tomate, mussarela, presunto, ovos e cebola', 'salgada', false, 3),
  ('Frango com Catupiry', 'molho de tomate, mussarela, frango, catupiry', 'salgada', false, 4),
  ('Calabresa', 'molho de tomate, mussarela, calabresa e cebola', 'salgada', false, 5),
  ('À Moda da Casa', 'molho de tomate, mussarela, presunto e catupiry', 'salgada', false, 6),
  ('Atum', 'molho de tomate, mussarela, atum e cebola', 'salgada', false, 7),
  ('Três Queijos', 'molho de tomate, mussarela, catupiry e parmesão', 'salgada', false, 8),
  ('Quatro Queijos', 'molho de tomate, mussarela, catupiry, gorgonzola e parmesão', 'salgada', false, 9),
  ('Bacon', 'molho de tomate, mussarela e bacon', 'salgada', false, 10),
  ('Carne Seca', 'molho de tomate, mussarela, carne seca, catupiry', 'salgada', false, 11),
  ('Napolitana', 'molho de tomate, mussarela, tomate e parmesão', 'salgada', false, 12),
  ('Chocolate', 'mussarela e chocolate', 'doce', false, 13),
  ('Banana', 'banana, açúcar, canela e leite condensado', 'doce', false, 14),
  ('Romeu e Julieta', 'mussarela e goiabada', 'doce', false, 15),
  ('Camarão', 'Molho de tomate, mussarela, camarão, catupiry original', 'salgada', true, 16),
  ('Filé com Coalho', 'Molho de tomate, mussarela, filé, queijo coalho, geleia de abacaxi', 'salgada', true, 17);

-- Preços dos sabores (usando subquery para IDs)
INSERT INTO public.pizza_flavor_prices (flavor_id, size_id, price)
SELECT f.id, s.id, 
  CASE 
    WHEN f.is_premium AND s.slug = 'brotinho' THEN 20.00
    WHEN f.is_premium AND s.slug = 'pequena' THEN 
      CASE WHEN f.name = 'Camarão' THEN 50.00 ELSE 40.00 END
    WHEN f.is_premium AND s.slug = 'media' THEN 
      CASE WHEN f.name = 'Camarão' THEN 60.00 ELSE 50.00 END
    WHEN f.is_premium AND s.slug = 'grande' THEN 
      CASE WHEN f.name = 'Camarão' THEN 70.00 ELSE 60.00 END
    WHEN f.is_premium AND s.slug = 'familia' THEN 
      CASE WHEN f.name = 'Camarão' THEN 80.00 ELSE 70.00 END
    WHEN s.slug = 'brotinho' THEN 15.00
    WHEN s.slug = 'pequena' THEN 34.00
    WHEN s.slug = 'media' THEN 43.00
    WHEN s.slug = 'grande' THEN 55.00
    WHEN s.slug = 'familia' THEN 65.00
    ELSE 0
  END
FROM public.pizza_flavors f
CROSS JOIN public.pizza_sizes s;

-- Extras (bordas)
INSERT INTO public.pizza_extras (name, type, price, display_order) VALUES
  ('Sem Borda', 'border', 0, 1),
  ('Catupiry', 'border', 8.00, 2),
  ('Cheddar', 'border', 8.00, 3),
  ('Chocolate', 'border', 10.00, 4),
  ('Doce de Leite', 'border', 10.00, 5);

-- Extras (coberturas)
INSERT INTO public.pizza_extras (name, type, price, display_order) VALUES
  ('Bacon', 'topping', 5.00, 10),
  ('Cheddar Extra', 'topping', 5.00, 11),
  ('Catupiry Extra', 'topping', 5.00, 12),
  ('Orégano Extra', 'topping', 2.00, 13);

-- Bairros de entrega
INSERT INTO public.neighborhoods (name, delivery_fee, display_order) VALUES
  ('Centro', 5.00, 1),
  ('Engenho', 5.00, 2),
  ('São Benedito', 6.00, 3),
  ('Trizidela', 7.00, 4),
  ('Alto da Cruz', 6.00, 5),
  ('Boa Vista', 7.00, 6),
  ('Cohab', 8.00, 7),
  ('Vila Nova', 6.00, 8);

-- Bebidas (categoria bebidas)
INSERT INTO public.products (category_id, name, price, sub_category, display_order)
SELECT c.id, b.name, b.price, b.sub_category, b.display_order
FROM public.categories c
CROSS JOIN (VALUES
  ('Coca-Cola 2L', 12.00, 'refrigerantes', 1),
  ('Coca-Cola Lata', 6.00, 'refrigerantes', 2),
  ('Guaraná 2L', 10.00, 'refrigerantes', 3),
  ('Guaraná Lata', 5.00, 'refrigerantes', 4),
  ('Fanta Laranja 2L', 10.00, 'refrigerantes', 5),
  ('Sprite 2L', 10.00, 'refrigerantes', 6),
  ('Suco de Laranja', 8.00, 'sucos', 10),
  ('Suco de Uva', 8.00, 'sucos', 11),
  ('Suco de Maracujá', 8.00, 'sucos', 12),
  ('Cerveja Heineken', 10.00, 'alcoolicas', 20),
  ('Cerveja Brahma', 7.00, 'alcoolicas', 21),
  ('Cerveja Skol', 6.00, 'alcoolicas', 22),
  ('Água Mineral 500ml', 4.00, 'agua', 30),
  ('Água com Gás', 5.00, 'agua', 31)
) AS b(name, price, sub_category, display_order)
WHERE c.slug = 'bebidas';

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;