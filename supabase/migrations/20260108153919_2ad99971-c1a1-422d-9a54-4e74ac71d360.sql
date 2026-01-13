-- Add retry tracking columns to print_jobs
ALTER TABLE public.print_jobs 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 2;