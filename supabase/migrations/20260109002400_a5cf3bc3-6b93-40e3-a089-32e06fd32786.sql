-- Insert pizza edges
INSERT INTO public.pizza_edges (id, store_id, category_id, name, display_order, is_active)
VALUES 
  ('a1b2c3d4-1111-4000-8000-000000000001', 'd76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Catupiry', 1, true),
  ('a1b2c3d4-2222-4000-8000-000000000002', 'd76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Cheddar', 2, true),
  ('a1b2c3d4-3333-4000-8000-000000000003', 'd76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Chocolate', 3, true);

-- Insert edge prices for all sizes
-- Catupiry prices
INSERT INTO public.pizza_edge_prices (edge_id, size_id, price, is_available)
VALUES 
  ('a1b2c3d4-1111-4000-8000-000000000001', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 6.00, true),
  ('a1b2c3d4-1111-4000-8000-000000000001', '27c5a183-f008-495e-a219-f5d7c6d10414', 8.00, true),
  ('a1b2c3d4-1111-4000-8000-000000000001', '881bd3cd-831a-410b-9fa1-c7f838898917', 10.00, true),
  ('a1b2c3d4-1111-4000-8000-000000000001', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 12.00, true),
  
  -- Cheddar prices
  ('a1b2c3d4-2222-4000-8000-000000000002', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 6.00, true),
  ('a1b2c3d4-2222-4000-8000-000000000002', '27c5a183-f008-495e-a219-f5d7c6d10414', 8.00, true),
  ('a1b2c3d4-2222-4000-8000-000000000002', '881bd3cd-831a-410b-9fa1-c7f838898917', 10.00, true),
  ('a1b2c3d4-2222-4000-8000-000000000002', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 12.00, true),
  
  -- Chocolate prices
  ('a1b2c3d4-3333-4000-8000-000000000003', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 7.00, true),
  ('a1b2c3d4-3333-4000-8000-000000000003', '27c5a183-f008-495e-a219-f5d7c6d10414', 9.00, true),
  ('a1b2c3d4-3333-4000-8000-000000000003', '881bd3cd-831a-410b-9fa1-c7f838898917', 11.00, true),
  ('a1b2c3d4-3333-4000-8000-000000000003', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 14.00, true);