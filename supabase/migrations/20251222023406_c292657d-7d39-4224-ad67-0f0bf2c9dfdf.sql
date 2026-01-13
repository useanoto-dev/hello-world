
-- =============================================
-- CORREÇÃO: Permitir criação de pedidos por qualquer pessoa
-- =============================================

-- 1. Adicionar política para permitir update do order_counter via SECURITY DEFINER function
-- A função generate_order_number precisa poder atualizar a tabela
DROP POLICY IF EXISTS "Public can use order counter via function" ON public.order_counter;
CREATE POLICY "Public can use order counter via function"
ON public.order_counter
FOR ALL
USING (true)
WITH CHECK (true);

-- 2. Recriar a função generate_order_number com owner correto
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS integer
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
  
  -- Se não encontrou, inicializa
  IF new_order_number IS NULL THEN
    INSERT INTO public.order_counter (id, last_order_number, last_reset_date)
    VALUES (1, 1, CURRENT_DATE)
    ON CONFLICT (id) DO UPDATE 
    SET last_order_number = 1
    RETURNING last_order_number INTO new_order_number;
  END IF;
  
  RETURN new_order_number;
END;
$$;

-- 3. Garantir que todos podem executar a função
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO service_role;

-- 4. Garantir que as políticas de orders e order_items permitem insert
-- Remover e recriar as políticas de INSERT para garantir que estão corretas
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
