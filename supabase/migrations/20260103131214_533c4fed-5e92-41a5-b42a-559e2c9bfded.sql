-- Add schedule column to stores table for day-by-day operating hours
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '{
  "monday": {"open": 8, "close": 22, "is_open": true},
  "tuesday": {"open": 8, "close": 22, "is_open": true},
  "wednesday": {"open": 8, "close": 22, "is_open": true},
  "thursday": {"open": 8, "close": 22, "is_open": true},
  "friday": {"open": 8, "close": 22, "is_open": true},
  "saturday": {"open": 8, "close": 22, "is_open": true},
  "sunday": {"open": 8, "close": 22, "is_open": true}
}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.stores.schedule IS 'Operating hours per day of week. Each day has open (0-23), close (0-23), and is_open (boolean) properties.';