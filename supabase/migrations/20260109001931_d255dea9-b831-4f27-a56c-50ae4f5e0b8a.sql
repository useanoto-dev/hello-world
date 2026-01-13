-- Insert flavor prices for all flavors and sizes
-- Calabresa prices
INSERT INTO public.pizza_flavor_prices (flavor_id, size_id, price, surcharge, is_available)
VALUES 
  ('132fb14f-07c7-4884-95e3-db8867c338cb', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 29.90, 0, true),
  ('132fb14f-07c7-4884-95e3-db8867c338cb', '27c5a183-f008-495e-a219-f5d7c6d10414', 44.90, 0, true),
  ('132fb14f-07c7-4884-95e3-db8867c338cb', '881bd3cd-831a-410b-9fa1-c7f838898917', 59.90, 0, true),
  ('132fb14f-07c7-4884-95e3-db8867c338cb', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 79.90, 0, true),
  
  -- Margherita prices
  ('5ba455e3-74d7-4c00-b3fc-5725d5e3b9e9', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 32.90, 0, true),
  ('5ba455e3-74d7-4c00-b3fc-5725d5e3b9e9', '27c5a183-f008-495e-a219-f5d7c6d10414', 47.90, 0, true),
  ('5ba455e3-74d7-4c00-b3fc-5725d5e3b9e9', '881bd3cd-831a-410b-9fa1-c7f838898917', 64.90, 0, true),
  ('5ba455e3-74d7-4c00-b3fc-5725d5e3b9e9', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 84.90, 0, true),
  
  -- Quatro Queijos prices (premium - with surcharge)
  ('f18dc455-a86e-4cb2-9578-76d0fa1e9200', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 35.90, 5.00, true),
  ('f18dc455-a86e-4cb2-9578-76d0fa1e9200', '27c5a183-f008-495e-a219-f5d7c6d10414', 52.90, 7.00, true),
  ('f18dc455-a86e-4cb2-9578-76d0fa1e9200', '881bd3cd-831a-410b-9fa1-c7f838898917', 69.90, 10.00, true),
  ('f18dc455-a86e-4cb2-9578-76d0fa1e9200', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 89.90, 12.00, true),
  
  -- Frango com Catupiry prices
  ('bb1c1220-07a4-432d-b705-f6f6c3a7983b', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 32.90, 0, true),
  ('bb1c1220-07a4-432d-b705-f6f6c3a7983b', '27c5a183-f008-495e-a219-f5d7c6d10414', 49.90, 0, true),
  ('bb1c1220-07a4-432d-b705-f6f6c3a7983b', '881bd3cd-831a-410b-9fa1-c7f838898917', 64.90, 0, true),
  ('bb1c1220-07a4-432d-b705-f6f6c3a7983b', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 84.90, 0, true),
  
  -- Portuguesa prices
  ('0f355204-8160-43e2-ba42-e1a503165f8d', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 34.90, 0, true),
  ('0f355204-8160-43e2-ba42-e1a503165f8d', '27c5a183-f008-495e-a219-f5d7c6d10414', 49.90, 0, true),
  ('0f355204-8160-43e2-ba42-e1a503165f8d', '881bd3cd-831a-410b-9fa1-c7f838898917', 66.90, 0, true),
  ('0f355204-8160-43e2-ba42-e1a503165f8d', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 86.90, 0, true),
  
  -- Chocolate prices
  ('552fb9a2-63e6-47b9-b22c-f63cf9372c9c', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 29.90, 0, true),
  ('552fb9a2-63e6-47b9-b22c-f63cf9372c9c', '27c5a183-f008-495e-a219-f5d7c6d10414', 44.90, 0, true),
  ('552fb9a2-63e6-47b9-b22c-f63cf9372c9c', '881bd3cd-831a-410b-9fa1-c7f838898917', 59.90, 0, true),
  ('552fb9a2-63e6-47b9-b22c-f63cf9372c9c', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 79.90, 0, true);