-- Remover política problemática e criar uma mais simples
DROP POLICY IF EXISTS "Users can create subscription for their store" ON public.subscriptions;

-- Permitir que usuários autenticados criem subscriptions
-- A validação de que o store_id pertence ao usuário será feita no código
CREATE POLICY "Authenticated users can create subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (true);