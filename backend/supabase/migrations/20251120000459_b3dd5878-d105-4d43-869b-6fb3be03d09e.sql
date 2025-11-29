-- Make the cvstorage bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'cvstorage';