-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'viewer');
CREATE TYPE public.booking_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.trip_type AS ENUM ('one_way', 'round_trip', 'recurring');
CREATE TYPE public.recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE public.notification_channel AS ENUM ('email', 'line', 'webhook');
CREATE TYPE public.report_type AS ENUM ('monthly_trips', 'department_cost', 'invoice_summary');
CREATE TYPE public.report_format AS ENUM ('xlsx', 'csv', 'pdf');

-- Tenants table (multi-tenant architecture)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  tax_id TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiles table (user profile data)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Cost centers table
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Passengers table
CREATE TABLE public.passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  department TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;

-- Addresses table
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  tags TEXT[],
  visible_to_roles public.app_role[] DEFAULT ARRAY['admin', 'manager', 'user']::public.app_role[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  booking_number TEXT NOT NULL UNIQUE,
  trip_type public.trip_type NOT NULL,
  passenger_id UUID REFERENCES public.passengers(id) ON DELETE RESTRICT NOT NULL,
  pickup_address_id UUID REFERENCES public.addresses(id) ON DELETE RESTRICT,
  pickup_address TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  dropoff_address_id UUID REFERENCES public.addresses(id) ON DELETE RESTRICT,
  dropoff_address TEXT NOT NULL,
  dropoff_latitude DOUBLE PRECISION NOT NULL,
  dropoff_longitude DOUBLE PRECISION NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  estimated_duration_minutes INTEGER,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  status public.booking_status NOT NULL DEFAULT 'scheduled',
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_frequency public.recurrence_frequency,
  recurrence_end_date DATE,
  parent_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2),
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- API keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Webhooks table
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Audit logs table (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  report_type public.report_type NOT NULL,
  format public.report_format NOT NULL,
  parameters JSONB,
  file_url TEXT,
  scheduled_cron TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON public.passengers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile and assign role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user (no tenants exist)
  SELECT NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1) INTO _is_first_user;

  IF _is_first_user THEN
    -- Create first tenant
    INSERT INTO public.tenants (name, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'Default Company'),
      NEW.email
    )
    RETURNING id INTO _tenant_id;

    -- Create profile for first user
    INSERT INTO public.profiles (id, tenant_id, full_name, email)
    VALUES (
      NEW.id,
      _tenant_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
      NEW.email
    );

    -- Assign admin role to first user
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, _tenant_id, 'admin');
  ELSE
    -- For subsequent users, tenant_id should be provided in metadata
    _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    
    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.profiles (id, tenant_id, full_name, email)
      VALUES (
        NEW.id,
        _tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.email
      );

      -- Assign default user role
      INSERT INTO public.user_roles (user_id, tenant_id, role)
      VALUES (NEW.id, _tenant_id, 'user');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to prevent audit log modification
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- RLS Policies

-- Tenants: Users can only see their own tenant
CREATE POLICY "Users can view own tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can update own tenant" ON public.tenants
  FOR UPDATE USING (
    id = public.get_user_tenant_id(auth.uid()) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Profiles: Users can view profiles in their tenant
CREATE POLICY "Users can view profiles in tenant" ON public.profiles
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- User roles: Admins can manage roles
CREATE POLICY "Users can view roles in tenant" ON public.user_roles
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Bookings: Users can view bookings in their tenant
CREATE POLICY "Users can view bookings in tenant" ON public.bookings
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Passengers: Users can view passengers in their tenant
CREATE POLICY "Users can view passengers in tenant" ON public.passengers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Managers can manage passengers" ON public.passengers
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Addresses: Users can view addresses based on visibility
CREATE POLICY "Users can view addresses in tenant" ON public.addresses
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      visible_to_roles IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = ANY(visible_to_roles)
      )
    )
  );

CREATE POLICY "Users can create addresses" ON public.addresses
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own addresses" ON public.addresses
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
  );

-- Cost centers: Users can view cost centers in their tenant
CREATE POLICY "Users can view cost_centers in tenant" ON public.cost_centers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage cost_centers" ON public.cost_centers
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Invoices: Users can view invoices in their tenant
CREATE POLICY "Users can view invoices in tenant" ON public.invoices
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- API keys: Admins only
CREATE POLICY "Admins can manage api_keys" ON public.api_keys
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Webhooks: Admins only
CREATE POLICY "Admins can manage webhooks" ON public.webhooks
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Webhook logs: Admins can view
CREATE POLICY "Admins can view webhook_logs" ON public.webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhooks 
      WHERE id = webhook_logs.webhook_id 
      AND tenant_id = public.get_user_tenant_id(auth.uid())
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Notifications: Users can view own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Audit logs: Admins can view
CREATE POLICY "Admins can view audit_logs" ON public.audit_logs
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Reports: Users can view reports in their tenant
CREATE POLICY "Users can view reports in tenant" ON public.reports
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage reports" ON public.reports
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Enable Realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;