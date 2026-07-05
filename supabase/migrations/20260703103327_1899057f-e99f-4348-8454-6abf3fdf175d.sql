
-- =====================================================================
-- HOSPISHIFT CORE: Multi-tenant WFM schema
-- =====================================================================

-- Drop scaffold tables (contained only test data)
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;

-- ---------- ENUMS ---------------------------------------------------
CREATE TYPE public.tenant_role AS ENUM ('owner','manager','planner','staff','viewer');
CREATE TYPE public.primary_role AS ENUM (
  'Physician_Attending','Physician_Resident','Nurse_Manager','Nurse_RN','Nurse_Aide','Midwife'
);
CREATE TYPE public.contract_type AS ENUM (
  'Full_Time','Part_Time','Freelancer_Locum','External_Consultant'
);
CREATE TYPE public.assignment_status AS ENUM (
  'Scheduled','Approved','In_Progress','Completed','Clocking_Anomaly','Replaced','Sick_Leave','Cancelled'
);
CREATE TYPE public.coverage_type AS ENUM (
  'Regular_Shift','On_Call_Active','On_Call_Passive','Mandatory_Overtime'
);
CREATE TYPE public.swap_status AS ENUM (
  'Pending_Peer','Pending_Manager','Approved','Declined','Cancelled','Auto_Approved'
);

-- ---------- TENANTS -------------------------------------------------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ---------- TENANT MEMBERSHIP --------------------------------------
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- ---------- SECURITY DEFINER HELPERS -------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.tenant_members WHERE tenant_id=_tenant AND user_id=_user);
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant uuid, _user uuid, _roles public.tenant_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id=_tenant AND user_id=_user AND role = ANY(_roles)
  );
$$;

-- Tenant + membership policies
CREATE POLICY "tenants_read_own" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(id, auth.uid()));
CREATE POLICY "tenants_create" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "members_read_self" ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid()
      OR public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));
CREATE POLICY "members_manage_by_owner" ON public.tenant_members FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));

-- ---------- TENANT CONFIG (parameterization matrix) ----------------
CREATE TABLE public.tenant_config (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  min_daily_rest_hrs numeric NOT NULL DEFAULT 11.0,
  max_weekly_work_hrs numeric NOT NULL DEFAULT 48.0,
  weekly_avg_ref_period_wks int NOT NULL DEFAULT 17,
  min_weekly_rest_hrs numeric NOT NULL DEFAULT 48.0,
  forbidden_sequence_matrix jsonb NOT NULL DEFAULT '{"N":["M","P"]}'::jsonb,
  overtime_threshold_mth_minutes int NOT NULL DEFAULT 14400,
  night_shift_window jsonb NOT NULL DEFAULT '{"start":"22:00","end":"06:00"}'::jsonb,
  auto_approval_peer_swap boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.tenant_config TO authenticated;
GRANT ALL ON public.tenant_config TO service_role;
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read" ON public.tenant_config FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "config_update" ON public.tenant_config FOR UPDATE TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));

-- ---------- EMPLOYEES ----------------------------------------------
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  tax_id text,
  email text NOT NULL,
  primary_role public.primary_role NOT NULL,
  contract_type public.contract_type NOT NULL DEFAULT 'Full_Time',
  fte_factor numeric NOT NULL DEFAULT 1.0 CHECK (fte_factor > 0 AND fte_factor <= 1),
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date,
  accumulated_overtime_month int NOT NULL DEFAULT 0,
  remaining_leave_balance int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_read" ON public.employees FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "employees_manage" ON public.employees FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- ---------- SKILLS -------------------------------------------------
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  is_mandatory_for_role public.primary_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, skill_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_read" ON public.skills FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "skills_manage" ON public.skills FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- ---------- EMPLOYEE ↔ SKILL --------------------------------------
CREATE TABLE public.employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  acquisition_date date NOT NULL DEFAULT CURRENT_DATE,
  certification_expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, skill_id)
);
CREATE INDEX idx_empskills_emp ON public.employee_skills(employee_id);
CREATE INDEX idx_empskills_skill ON public.employee_skills(skill_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_skills TO authenticated;
GRANT ALL ON public.employee_skills TO service_role;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empskills_read" ON public.employee_skills FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id AND public.is_tenant_member(e.tenant_id, auth.uid())
  ));
CREATE POLICY "empskills_manage" ON public.employee_skills FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
      AND public.has_tenant_role(e.tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
      AND public.has_tenant_role(e.tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[])
  ));

-- ---------- DEPARTMENTS --------------------------------------------
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_name text NOT NULL,
  cost_center_code text,
  color_code text NOT NULL DEFAULT '#3b82f6',
  min_staffing_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, department_name)
);
CREATE INDEX idx_departments_tenant ON public.departments(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_read" ON public.departments FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "departments_manage" ON public.departments FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- ---------- SHIFT TEMPLATES ----------------------------------------
CREATE TABLE public.shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shift_code text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_night_shift boolean NOT NULL DEFAULT false,
  allocated_break_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, shift_code)
);
CREATE INDEX idx_templates_tenant ON public.shift_templates(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_templates TO authenticated;
GRANT ALL ON public.shift_templates TO service_role;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read" ON public.shift_templates FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "templates_manage" ON public.shift_templates FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- ---------- SHIFT ASSIGNMENTS (transactional roster) ---------------
CREATE TABLE public.shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  shift_template_id uuid REFERENCES public.shift_templates(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  actual_start_timestamp timestamptz NOT NULL,
  actual_end_timestamp timestamptz NOT NULL,
  assignment_status public.assignment_status NOT NULL DEFAULT 'Scheduled',
  coverage_type public.coverage_type NOT NULL DEFAULT 'Regular_Shift',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actual_end_timestamp > actual_start_timestamp)
);
CREATE INDEX idx_assign_tenant_date ON public.shift_assignments(tenant_id, shift_date);
CREATE INDEX idx_assign_employee_time ON public.shift_assignments(employee_id, actual_start_timestamp);
CREATE INDEX idx_assign_department_date ON public.shift_assignments(department_id, shift_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_assignments TO authenticated;
GRANT ALL ON public.shift_assignments TO service_role;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_read" ON public.shift_assignments FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "assignments_manage" ON public.shift_assignments FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- ---------- SHIFT SWAP REQUESTS ------------------------------------
CREATE TABLE public.shift_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requester_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requester_assignment_id uuid NOT NULL REFERENCES public.shift_assignments(id) ON DELETE CASCADE,
  target_assignment_id uuid REFERENCES public.shift_assignments(id) ON DELETE CASCADE,
  status public.swap_status NOT NULL DEFAULT 'Pending_Peer',
  compliance_report jsonb,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_swaps_tenant ON public.shift_swaps(tenant_id, status);
GRANT SELECT, INSERT, UPDATE ON public.shift_swaps TO authenticated;
GRANT ALL ON public.shift_swaps TO service_role;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swaps_read" ON public.shift_swaps FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "swaps_insert_own" ON public.shift_swaps FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_member(tenant_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = requester_employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "swaps_update" ON public.shift_swaps FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[])
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = target_employee_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = requester_employee_id AND e.user_id = auth.uid())
  );

-- ---------- AUDIT LOG (immutable) ----------------------------------
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  delta_values jsonb,
  hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_created ON public.audit_log(tenant_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read_managers" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));
CREATE POLICY "audit_insert_members" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) AND user_id = auth.uid());
-- No UPDATE/DELETE policies → rows immutable for non-service_role

-- ---------- updated_at triggers ------------------------------------
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_config_updated BEFORE UPDATE ON public.tenant_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_skills_updated BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_swaps_updated BEFORE UPDATE ON public.shift_swaps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Auto-provisioning helpers ------------------------------
-- Bootstrap default config on new tenant
CREATE OR REPLACE FUNCTION public.init_tenant_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.tenant_config(tenant_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_init_tenant_config AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.init_tenant_config();

-- Creator becomes owner automatically (server fn sets local role via SECURITY DEFINER path)
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(_name text, _slug text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.tenants(name, slug) VALUES (_name, _slug) RETURNING id INTO new_id;
  INSERT INTO public.tenant_members(tenant_id, user_id, role) VALUES (new_id, auth.uid(), 'owner');
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_tenant_with_owner(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(text, text) TO authenticated;
