-- Atualizar preços base dos tamanhos de pizza
UPDATE public.pizza_sizes SET base_price = 25.00 WHERE slug = 'broto';
UPDATE public.pizza_sizes SET base_price = 45.00 WHERE slug = 'media';
UPDATE public.pizza_sizes SET base_price = 55.00 WHERE slug = 'grande';
UPDATE public.pizza_sizes SET base_price = 70.00 WHERE slug = 'gigante';

-- Inserir alguns sabores de pizza básicos
INSERT INTO public.pizza_flavors (name, ingredients, category, display_order) VALUES
  ('Mussarela', 'Molho de tomate, mussarela e orégano', 'salgada', 1),
  ('Calabresa', 'Molho de tomate, mussarela, calabresa e cebola', 'salgada', 2),
  ('Portuguesa', 'Molho de tomate, mussarela, presunto, ovos, cebola e azeitona', 'salgada', 3),
  ('Frango com Catupiry', 'Molho de tomate, mussarela, frango desfiado e catupiry', 'salgada', 4),
  ('Marguerita', 'Molho de tomate, mussarela, tomate e manjericão', 'salgada', 5),
  ('Quatro Queijos', 'Molho de tomate, mussarela, provolone, parmesão e catupiry', 'especial', 6),
  ('Camarão', 'Molho de tomate, mussarela, camarão e catupiry', 'especial', 7),
  ('Chocolate', 'Chocolate ao leite e granulado', 'doce', 8),
  ('Romeu e Julieta', 'Mussarela e goiabada', 'doce', 9)
ON CONFLICT DO NOTHING;

-- Inserir alguns extras de pizza
INSERT INTO public.pizza_extras (name, type, display_order) VALUES
  ('Borda Catupiry', 'borda', 1),
  ('Borda Cheddar', 'borda', 2),
  ('Borda Chocolate', 'borda', 3),
  ('Bacon Extra', 'cobertura', 4),
  ('Catupiry Extra', 'cobertura', 5)
ON CONFLICT DO NOTHING;

-- Inserir áreas de entrega
INSERT INTO public.delivery_areas (name, delivery_fee, delivery_time_min, delivery_time_max, display_order) VALUES
  ('Centro', 5.00, 20, 35, 1),
  ('Bairro 1', 7.00, 25, 40, 2),
  ('Bairro 2', 8.00, 30, 45, 3),
  ('Bairro 3', 10.00, 35, 50, 4)
ON CONFLICT DO NOTHING;