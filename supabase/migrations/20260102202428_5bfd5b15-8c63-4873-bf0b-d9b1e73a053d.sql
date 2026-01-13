-- Permitir que usuários autenticados criem novas lojas
CREATE POLICY "Authenticated users can create stores"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Também precisamos permitir que usuários autenticados criem seu próprio perfil inicial
-- (já existe, mas vamos garantir que funcione para update também)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Permitir que usuários criem assinaturas para suas próprias lojas
CREATE POLICY "Users can create subscription for their store"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.store_id = subscriptions.store_id
  )
);