-- Limpar dados antigos do inventário
-- 1. Deletar movimentações de inventário
DELETE FROM inventory_movements;

-- 2. Deletar produtos do inventário
DELETE FROM inventory_products;

-- 3. Deletar categorias do inventário
DELETE FROM inventory_categories;

-- 4. Deletar categoria "Lanches" remanescente do cardápio
DELETE FROM categories;