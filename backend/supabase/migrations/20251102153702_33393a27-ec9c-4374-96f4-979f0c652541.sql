-- Create RLS policies for cvstorage bucket to allow authenticated users to manage their files

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvstorage'
);

-- Allow authenticated users to view/download files
CREATE POLICY "Authenticated users can view CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cvstorage');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update CVs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cvstorage')
WITH CHECK (bucket_id = 'cvstorage');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cvstorage');