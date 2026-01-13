-- Update existing stores with old slugs (without ID suffix) to include the store ID
UPDATE stores 
SET slug = CONCAT(slug, '-', LEFT(id::text, 6))
WHERE slug NOT LIKE '%-______' -- Slugs that don't end with -6chars pattern
  AND slug !~ '-[a-z0-9]{6}$'; -- More precise: doesn't end with dash followed by 6 alphanumeric chars