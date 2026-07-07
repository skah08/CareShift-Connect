-- Pending requests table for admin approval workflow

CREATE TYPE public.request_type AS ENUM ('tenant_join', 'shift_change', 'leave_request');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE public.pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type public.request_type NOT NULL DEFAULT 'tenant_join',
  status public.request_status NOT NULL DEFAULT 'pending',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

CREATE UNIQUE INDEX idx_pending_requests_user_type ON public.pending_requests(user_id, request_type) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pending_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "pending_requests_select_own" ON public.pending_requests
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own pending request
CREATE POLICY "pending_requests_insert_own" ON public.pending_requests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can read all requests
CREATE POLICY "pending_requests_select_admin" ON public.pending_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can update any request (approve/decline)
CREATE POLICY "pending_requests_update_admin" ON public.pending_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Helper function: check if user has a pending request of a given type
CREATE OR REPLACE FUNCTION public.has_pending_request(p_user_id UUID, p_request_type public.request_type)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pending_requests
    WHERE user_id = p_user_id AND request_type = p_request_type AND status = 'pending'
  );
$$;

-- Create a pending tenant_join request (uses auth.users for email)
CREATE OR REPLACE FUNCTION public.create_tenant_join_request()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_email TEXT;
  v_member_count BIGINT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- If already a tenant member, no need for a pending request
  SELECT COUNT(*) INTO v_member_count
  FROM public.tenant_members
  WHERE user_id = auth.uid();

  IF v_member_count > 0 THEN
    RAISE EXCEPTION 'User is already a member of a tenant';
  END IF;

  -- Check if already has a pending request
  SELECT id INTO v_existing_id
  FROM public.pending_requests
  WHERE user_id = auth.uid() AND request_type = 'tenant_join' AND status = 'pending';

  IF FOUND THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.pending_requests (user_id, request_type, payload)
  VALUES (auth.uid(), 'tenant_join', jsonb_build_object('email', v_email))
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Approve a pending request (admin only, creates tenant membership and employee record for tenant_join)
CREATE OR REPLACE FUNCTION public.approve_pending_request(
  p_request_id UUID,
  p_tenant_id UUID,
  p_role public.tenant_role,
  p_department_id UUID DEFAULT NULL,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_request_type public.request_type;
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_employee_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve requests';
  END IF;

  SELECT user_id, request_type INTO v_user_id, v_request_type
  FROM public.pending_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- For tenant_join requests, create the membership and employee record
  IF v_request_type = 'tenant_join' THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (p_tenant_id, v_user_id, p_role)
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    -- Get user email and metadata
    SELECT email, raw_user_meta_data ->> 'first_name', raw_user_meta_data ->> 'last_name'
    INTO v_email, v_first_name, v_last_name
    FROM auth.users
    WHERE id = v_user_id;

    -- Fallback to email local part if name not set in metadata
    IF v_first_name IS NULL THEN
      v_first_name := split_part(v_email, '@', 1);
    END IF;
    IF v_last_name IS NULL THEN
      v_last_name := '';
    END IF;

    -- Create employee record
    INSERT INTO public.employees (tenant_id, user_id, first_name, last_name, email, primary_role, contract_type)
    VALUES (p_tenant_id, v_user_id, v_first_name, v_last_name, v_email, 'Nurse_RN', 'Full_Time')
    RETURNING id INTO v_employee_id;

    -- Link to department if provided
    IF p_department_id IS NOT NULL THEN
      INSERT INTO public.employee_departments (employee_id, department_id, is_primary)
      VALUES (v_employee_id, p_department_id, true);
    END IF;
  END IF;

  UPDATE public.pending_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_request_id;
END;
$$;

-- Decline a pending request (admin only)
CREATE OR REPLACE FUNCTION public.decline_pending_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can decline requests';
  END IF;

  UPDATE public.pending_requests
  SET status = 'declined',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_request_id AND status = 'pending';
END;
$$;

-- List pending requests (admin only)
CREATE OR REPLACE FUNCTION public.list_pending_requests(p_request_type public.request_type DEFAULT NULL)
RETURNS TABLE (id UUID, user_id UUID, email TEXT, request_type public.request_type, payload JSONB, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT pr.id, pr.user_id, (pr.payload ->> 'email')::TEXT AS email, pr.request_type, pr.payload, pr.created_at
  FROM public.pending_requests pr
  WHERE pr.status = 'pending'
    AND (p_request_type IS NULL OR pr.request_type = p_request_type)
  ORDER BY pr.created_at ASC;
$$;

-- List all tenants for the approval dropdown (admin only)
CREATE OR REPLACE FUNCTION public.list_tenants_for_approval()
RETURNS TABLE (id UUID, name TEXT, slug TEXT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.id, t.name, t.slug
  FROM public.tenants t
  ORDER BY t.name ASC;
$$;

-- List departments for a tenant (admin only, used in approval dialog)
CREATE OR REPLACE FUNCTION public.list_departments_for_approval(p_tenant_id UUID)
RETURNS TABLE (id UUID, name TEXT, cost_center_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT d.id, d.name, d.cost_center_code
  FROM public.departments d
  WHERE d.tenant_id = p_tenant_id
  ORDER BY d.name ASC;
$$;
