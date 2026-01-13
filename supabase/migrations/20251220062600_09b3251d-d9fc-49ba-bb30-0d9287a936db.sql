-- Limpar dados antigos de pizza_extras
DELETE FROM pizza_extras;

-- Inserir as bordas do arquivo CSV
INSERT INTO pizza_extras (name, price, type, is_available, display_order) VALUES
('Borda Catupiry', 10.0, 'borda', true, 1),
('Borda Cheddar', 10.0, 'borda', true, 2),
('Borda Chocolate', 10.0, 'borda', true, 3),
('Borda Mussarela', 10.0, 'borda', true, 4);

-- Inserir as coberturas do arquivo CSV
INSERT INTO pizza_extras (name, price, type, is_available, display_order) VALUES
('Cobertura Calabresa', 7.0, 'cobertura', true, 10),
('Cobertura Bacon', 7.0, 'cobertura', true, 11),
('Cobertura Tomate', 7.0, 'cobertura', true, 12),
('Cobertura Cebola', 7.0, 'cobertura', true, 13),
('Cobertura Frango', 7.0, 'cobertura', true, 14);