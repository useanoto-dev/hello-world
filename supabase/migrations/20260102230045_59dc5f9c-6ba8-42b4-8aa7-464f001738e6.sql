-- Atualizar default de onboarding_completed para true
ALTER TABLE public.stores 
ALTER COLUMN onboarding_completed SET DEFAULT true;

-- Marcar lojas existentes como onboarding completo
UPDATE public.stores SET onboarding_completed = true WHERE onboarding_completed = false;