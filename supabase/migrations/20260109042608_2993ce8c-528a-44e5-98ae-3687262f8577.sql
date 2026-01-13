-- Create table for pizza flow steps configuration
CREATE TABLE public.pizza_flow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL, -- 'size', 'flavor', 'edge', 'dough', 'drink'
  step_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, step_type)
);

-- Enable RLS
ALTER TABLE public.pizza_flow_steps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active flow steps"
ON public.pizza_flow_steps
FOR SELECT
USING (is_enabled = true);

CREATE POLICY "Store owners can manage flow steps"
ON public.pizza_flow_steps
FOR ALL
USING (is_store_owner(auth.uid(), store_id));

-- Trigger for updated_at
CREATE TRIGGER update_pizza_flow_steps_updated_at
BEFORE UPDATE ON public.pizza_flow_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX idx_pizza_flow_steps_category ON public.pizza_flow_steps(category_id);
CREATE INDEX idx_pizza_flow_steps_store ON public.pizza_flow_steps(store_id);