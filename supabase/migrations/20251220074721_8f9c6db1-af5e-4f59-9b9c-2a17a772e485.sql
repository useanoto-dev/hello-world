-- Create printer settings table
CREATE TABLE public.printer_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  printer_name text NOT NULL DEFAULT 'Impressora Principal',
  printer_model text NOT NULL DEFAULT '80mm',
  ip_address text,
  port integer DEFAULT 9100,
  auto_print_enabled boolean DEFAULT false,
  print_test_on_connect boolean DEFAULT false,
  paper_cut_enabled boolean DEFAULT true,
  copies integer DEFAULT 1,
  is_connected boolean DEFAULT false,
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage printer settings
CREATE POLICY "Admins can manage printer settings"
ON public.printer_settings
FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Insert default printer config
INSERT INTO public.printer_settings (printer_name, printer_model, ip_address)
VALUES ('Impressora Principal', '80mm', '192.168.1.100');

-- Add trigger for updated_at
CREATE TRIGGER update_printer_settings_updated_at
BEFORE UPDATE ON public.printer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();