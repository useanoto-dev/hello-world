-- Add image_url column to whatsapp_campaigns
ALTER TABLE public.whatsapp_campaigns
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for broadcast images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'broadcast-images',
  'broadcast-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload broadcast images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'broadcast-images');

-- Create policy for public read access
CREATE POLICY "Public can view broadcast images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'broadcast-images');