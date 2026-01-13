-- Deletar categorias duplicadas (mantendo as primeiras criadas)
DELETE FROM categories WHERE id IN (
  '55e3582b-5a89-49c3-9784-dbadaa76ac2b', -- Cervejas duplicada
  '78ab768d-73cb-4f5d-9765-a620ffb554fd', -- Outras Alcoólicas duplicada
  'c3bf5f3a-9369-4973-ab83-933b3b42c257', -- Refrigerantes duplicada
  '1c90a147-3803-408f-b48f-4aab5589dccf'  -- Sucos duplicada
);