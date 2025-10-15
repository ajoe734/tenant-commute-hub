-- Fix search_path for prevent_audit_log_modification function
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
  RETURN NULL;
END;
$$;