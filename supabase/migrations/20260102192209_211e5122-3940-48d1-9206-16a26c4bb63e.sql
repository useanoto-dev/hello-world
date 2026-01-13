-- Create storage bucket for establishment logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('establishment-logos', 'establishment-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone to view logos
CREATE POLICY "Public logos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'establishment-logos');

-- Policy to allow establishment owners to upload their logos
CREATE POLICY "Establishment owners can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'establishment-logos' 
  AND auth.uid() IS NOT NULL
);

-- Policy to allow establishment owners to update their logos
CREATE POLICY "Establishment owners can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'establishment-logos' 
  AND auth.uid() IS NOT NULL
);

-- Policy to allow establishment owners to delete their logos
CREATE POLICY "Establishment owners can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'establishment-logos' 
  AND auth.uid() IS NOT NULL
);