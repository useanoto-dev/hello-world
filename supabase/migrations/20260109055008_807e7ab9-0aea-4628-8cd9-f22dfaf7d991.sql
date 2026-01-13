-- Inserir massas de exemplo
INSERT INTO pizza_doughs (store_id, category_id, name, description, display_order, is_active) VALUES
('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Tradicional', 'Massa clássica crocante por fora e macia por dentro', 1, true),
('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Integral', 'Massa integral mais saudável e nutritiva', 2, true),
('d76c472f-b50d-4025-842f-1513a377d4f0', '763e9b26-f858-4561-9add-2f6d4d5267c6', 'Sem Glúten', 'Massa especial para intolerantes ao glúten', 3, true);

-- Inserir preços das massas para todos os tamanhos
-- Vamos pegar os IDs das massas recém criadas e criar os preços
INSERT INTO pizza_dough_prices (dough_id, size_id, price, is_available)
SELECT d.id, s.id, 
  CASE 
    WHEN d.name = 'Tradicional' THEN 0
    WHEN d.name = 'Integral' THEN CASE s.name WHEN 'Pequena' THEN 3 WHEN 'Média' THEN 4 WHEN 'Grande' THEN 5 ELSE 6 END
    WHEN d.name = 'Sem Glúten' THEN CASE s.name WHEN 'Pequena' THEN 5 WHEN 'Média' THEN 7 WHEN 'Grande' THEN 9 ELSE 11 END
  END as price,
  true as is_available
FROM pizza_doughs d
CROSS JOIN pizza_sizes s
WHERE d.store_id = 'd76c472f-b50d-4025-842f-1513a377d4f0'
  AND s.store_id = 'd76c472f-b50d-4025-842f-1513a377d4f0'
  AND d.is_active = true
  AND s.is_active = true;

-- Inserir preços das bordas para todos os tamanhos
INSERT INTO pizza_edge_prices (edge_id, size_id, price, is_available) VALUES
-- Catupiry
('a1b2c3d4-1111-4000-8000-000000000001', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 6, true),  -- Pequena
('a1b2c3d4-1111-4000-8000-000000000001', '27c5a183-f008-495e-a219-f5d7c6d10414', 8, true),  -- Média
('a1b2c3d4-1111-4000-8000-000000000001', '881bd3cd-831a-410b-9fa1-c7f838898917', 10, true), -- Grande
('a1b2c3d4-1111-4000-8000-000000000001', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 12, true), -- Gigante
-- Cheddar
('a1b2c3d4-2222-4000-8000-000000000002', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 7, true),
('a1b2c3d4-2222-4000-8000-000000000002', '27c5a183-f008-495e-a219-f5d7c6d10414', 9, true),
('a1b2c3d4-2222-4000-8000-000000000002', '881bd3cd-831a-410b-9fa1-c7f838898917', 11, true),
('a1b2c3d4-2222-4000-8000-000000000002', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 13, true),
-- Chocolate
('a1b2c3d4-3333-4000-8000-000000000003', 'fa3805ef-1e9a-44b3-bb8c-36afcc42347c', 8, true),
('a1b2c3d4-3333-4000-8000-000000000003', '27c5a183-f008-495e-a219-f5d7c6d10414', 10, true),
('a1b2c3d4-3333-4000-8000-000000000003', '881bd3cd-831a-410b-9fa1-c7f838898917', 12, true),
('a1b2c3d4-3333-4000-8000-000000000003', '07cc3a04-6d4e-4fc4-8686-e51b1813e672', 14, true);