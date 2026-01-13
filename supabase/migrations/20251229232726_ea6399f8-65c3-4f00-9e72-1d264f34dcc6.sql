-- Limpar dados existentes para inserir novos
DELETE FROM delivery_areas;
DELETE FROM pizza_extras;
DELETE FROM pizza_extra_prices;

-- Inserir bairros do CSV
INSERT INTO delivery_areas (name, delivery_fee, is_active, display_order) VALUES
('Aeroporto', 5, true, 1),
('Alto da Boa Vista', 5, true, 2),
('Alto são José', 5, true, 3),
('Bachada', 5, true, 4),
('Baixinha', 5, true, 5),
('Bairro Jerusalém', 5, true, 6),
('Bairro São Benedito', 5, true, 7),
('Bairro São Francisco', 5, true, 8),
('Bela vista', 5, true, 9),
('Boiada', 5, true, 10),
('Centro', 5, true, 11),
('Conjunto primavera', 5, true, 12),
('Diogo', 5, true, 13),
('Engenho', 5, true, 14),
('Goiabal', 5, true, 15),
('Lolita 01', 5, true, 16),
('Lolita 02', 5, true, 17),
('Loteamento novo horizonte', 5, true, 18),
('Loteamento ouro vivo', 5, true, 19),
('Loteamento passos', 5, true, 20),
('Loteamento pedra grande', 5, true, 21),
('Loteamento são José', 5, true, 22),
('Loteamento tavinho', 5, true, 23),
('Majo Lucena', 5, true, 24),
('Maria rita', 5, true, 25),
('Matador', 5, true, 26),
('Monti Cristo', 5, true, 27),
('Morro do calango', 5, true, 28),
('Multirão', 5, true, 29),
('Nova pedreiras', 5, true, 30),
('Novo seringal', 5, true, 31),
('Parque das palmeiras', 5, true, 32),
('Parque Enrique', 5, true, 33),
('Prainha', 5, true, 34),
('Rua do campo', 5, true, 35),
('Santo Antônio dos Oliveira', 5, true, 36),
('São Benedito', 5, true, 37),
('Siringal', 5, true, 38),
('Transoau', 5, true, 39),
('Trizidela do vale', 5, true, 40),
('Vila das palmeiras', 5, true, 41),
('Zé da preta', 5, true, 42);

-- Inserir bordas (extras do tipo borda)
INSERT INTO pizza_extras (name, type, display_order, is_available) VALUES
('Borda Catupiry', 'borda', 1, true),
('Borda Cheddar', 'borda', 2, true),
('Borda Chocolate', 'borda', 3, true),
('Borda Mussarela', 'borda', 4, true);

-- Inserir coberturas (extras do tipo cobertura)
INSERT INTO pizza_extras (name, type, display_order, is_available) VALUES
('Cobertura Bacon', 'cobertura', 10, true),
('Cobertura Tomate', 'cobertura', 11, true),
('Cobertura Cebola', 'cobertura', 12, true),
('Cobertura Frango', 'cobertura', 13, true),
('Cobertura Calabresa', 'cobertura', 14, true);

-- Inserir preços para bordas (R$10 para todos os tamanhos)
INSERT INTO pizza_extra_prices (extra_id, size_id, price, is_active)
SELECT e.id, s.id, 10, true
FROM pizza_extras e
CROSS JOIN pizza_sizes s
WHERE e.type = 'borda';

-- Inserir preços para coberturas (R$7 para todos os tamanhos)
INSERT INTO pizza_extra_prices (extra_id, size_id, price, is_active)
SELECT e.id, s.id, 7, true
FROM pizza_extras e
CROSS JOIN pizza_sizes s
WHERE e.type = 'cobertura';