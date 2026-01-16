-- Drop existing storage policies for policy-documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Policy documents are publicly accessible" ON storage.objects;

-- Recreate policies with simpler, more permissive rules for admins
CREATE POLICY "Anyone can read policy documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'policy-documents');

CREATE POLICY "Admins can upload policy documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update policy documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'policy-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete policy documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'policy-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);