-- Create automatic audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
BEGIN
  -- Get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    _tenant_id := OLD.tenant_id;
  ELSE
    _tenant_id := NEW.tenant_id;
  END IF;

  -- Insert audit log
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tenant_id,
      user_id,
      table_name,
      record_id,
      action,
      new_values
    ) VALUES (
      _tenant_id,
      auth.uid(),
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      tenant_id,
      user_id,
      table_name,
      record_id,
      action,
      old_values,
      new_values
    ) VALUES (
      _tenant_id,
      auth.uid(),
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tenant_id,
      user_id,
      table_name,
      record_id,
      action,
      old_values
    ) VALUES (
      _tenant_id,
      auth.uid(),
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD)
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply audit triggers to key tables
CREATE TRIGGER bookings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER passengers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.passengers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER cost_centers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER addresses_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER api_keys_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();