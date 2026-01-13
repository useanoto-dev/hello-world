-- Add next_step_id column to store connections between steps
ALTER TABLE public.pizza_flow_steps 
ADD COLUMN next_step_id text;

-- Add position columns for the visual editor
ALTER TABLE public.pizza_flow_steps 
ADD COLUMN position_x numeric DEFAULT 0,
ADD COLUMN position_y numeric DEFAULT 0;