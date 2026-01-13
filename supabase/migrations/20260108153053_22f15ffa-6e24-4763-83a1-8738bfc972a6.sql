-- Create print_jobs table for tracking PrintNode print history
CREATE TABLE public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number INTEGER,
  printnode_job_id INTEGER,
  printer_id TEXT NOT NULL,
  printer_name TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owners can manage print jobs"
ON public.print_jobs
FOR ALL
USING (is_store_owner(auth.uid(), store_id));

CREATE POLICY "Anyone can read print jobs"
ON public.print_jobs
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert print jobs"
ON public.print_jobs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_print_jobs_store_id ON public.print_jobs(store_id);
CREATE INDEX idx_print_jobs_created_at ON public.print_jobs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_print_jobs_updated_at
BEFORE UPDATE ON public.print_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();