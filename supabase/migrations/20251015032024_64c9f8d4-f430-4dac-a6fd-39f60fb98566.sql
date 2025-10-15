-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
);

-- RLS policies for reports bucket
CREATE POLICY "Users can view own tenant reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "System can upload reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "System can update reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Admins can delete reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text AND
  has_role(auth.uid(), 'admin')
);