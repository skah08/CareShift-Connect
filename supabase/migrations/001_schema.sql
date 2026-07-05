-- ============================================================================
-- 001_schema.sql
-- CareShift Connect — Schema completo
-- Consolida le migrazioni: 20260702_*, 20260703_*, 20260705_*, 20260706_*
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');
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
CREATE TYPE public.leave_type AS ENUM ('Annual', 'Sick', 'Personal', 'Other');
CREATE TYPE public.leave_status AS ENUM ('Approved', 'Pending', 'Declined');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. User details
CREATE TABLE public.user_details (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  theme_preference TEXT NOT NULL DEFAULT 'light',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

-- 3. User roles (app-level, cross-tenant)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Tenants (organizations/hospitals)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. Tenant membership
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 6. Tenant configuration
CREATE TABLE public.tenant_config (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  min_daily_rest_hrs NUMERIC NOT NULL DEFAULT 11.0,
  max_weekly_work_hrs NUMERIC NOT NULL DEFAULT 48.0,
  weekly_avg_ref_period_wks INT NOT NULL DEFAULT 17,
  min_weekly_rest_hrs NUMERIC NOT NULL DEFAULT 48.0,
  forbidden_sequence_matrix JSONB NOT NULL DEFAULT '{"N":["M","P"]}'::jsonb,
  overtime_threshold_mth_minutes INT NOT NULL DEFAULT 14400,
  night_shift_window JSONB NOT NULL DEFAULT '{"start":"22:00","end":"06:00"}'::jsonb,
  auto_approval_peer_swap BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;

-- 7. Skills
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  is_mandatory_for_role public.primary_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, skill_name)
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- 8. Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  tax_id TEXT,
  email TEXT NOT NULL,
  primary_role public.primary_role NOT NULL,
  contract_type public.contract_type NOT NULL DEFAULT 'Full_Time',
  fte_factor NUMERIC NOT NULL DEFAULT 1.0 CHECK (fte_factor > 0 AND fte_factor <= 1),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  accumulated_overtime_month INT NOT NULL DEFAULT 0,
  remaining_leave_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 9. Employee <-> Skills (N:N)
CREATE TABLE public.employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  certification_expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, skill_id)
);
CREATE INDEX idx_empskills_emp ON public.employee_skills(employee_id);
CREATE INDEX idx_empskills_skill ON public.employee_skills(skill_id);
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

-- 10. Departments (tenant-scoped)
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  cost_center_code TEXT,
  color_code TEXT NOT NULL DEFAULT '#3b82f6',
  min_staffing_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, department_name)
);
CREATE INDEX idx_departments_tenant ON public.departments(tenant_id);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 11. Employee <-> Departments (N:N)
CREATE TABLE public.employee_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, department_id)
);
CREATE INDEX idx_emp_dept_employee ON public.employee_departments(employee_id);
CREATE INDEX idx_emp_dept_department ON public.employee_departments(department_id);
ALTER TABLE public.employee_departments ENABLE ROW LEVEL SECURITY;

-- 12. Shift templates
CREATE TABLE public.shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shift_code TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_night_shift BOOLEAN NOT NULL DEFAULT false,
  allocated_break_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, shift_code)
);
CREATE INDEX idx_templates_tenant ON public.shift_templates(tenant_id);
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

-- 13. Shift assignments (transactional roster)
CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  shift_template_id UUID REFERENCES public.shift_templates(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  actual_start_timestamp TIMESTAMPTZ NOT NULL,
  actual_end_timestamp TIMESTAMPTZ NOT NULL,
  assignment_status public.assignment_status NOT NULL DEFAULT 'Scheduled',
  coverage_type public.coverage_type NOT NULL DEFAULT 'Regular_Shift',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (actual_end_timestamp > actual_start_timestamp)
);
CREATE INDEX idx_assign_tenant_date ON public.shift_assignments(tenant_id, shift_date);
CREATE INDEX idx_assign_employee_time ON public.shift_assignments(employee_id, actual_start_timestamp);
CREATE INDEX idx_assign_department_date ON public.shift_assignments(department_id, shift_date);
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- 14. Shift swap requests
CREATE TABLE public.shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requester_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requester_assignment_id UUID NOT NULL REFERENCES public.shift_assignments(id) ON DELETE CASCADE,
  target_assignment_id UUID REFERENCES public.shift_assignments(id) ON DELETE CASCADE,
  status public.swap_status NOT NULL DEFAULT 'Pending_Peer',
  compliance_report JSONB,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_swaps_tenant ON public.shift_swaps(tenant_id, status);
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;

-- 15. Leaves (vacation / time off)
CREATE TABLE public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type public.leave_type NOT NULL DEFAULT 'Annual',
  status public.leave_status NOT NULL DEFAULT 'Pending',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leaves_date_check CHECK (end_date >= start_date)
);
CREATE INDEX idx_leaves_tenant ON public.leaves(tenant_id);
CREATE INDEX idx_leaves_employee ON public.leaves(employee_id);
CREATE INDEX idx_leaves_dates ON public.leaves(tenant_id, start_date, end_date);
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- 16. Permissions catalog
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 17. User <-> Permissions (per tenant)
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(permission_key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, tenant_id, permission_key)
);
CREATE INDEX idx_user_permissions_user_tenant ON public.user_permissions(user_id, tenant_id);
CREATE INDEX idx_user_permissions_tenant ON public.user_permissions(tenant_id);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 18. Audit log (immutable)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  delta_values JSONB,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_created ON public.audit_log(tenant_id, created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCTIONS (after all tables exist)
-- ============================================================================

-- has_role (used by RLS policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Tenant membership helpers (used by RLS policies)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant UUID, _user UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.tenant_members WHERE tenant_id = _tenant AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant UUID, _user UUID, _roles public.tenant_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant AND user_id = _user AND role = ANY(_roles)
  );
$$;

-- Permission helper (used by RLS policies)
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_tenant_id UUID,
  p_permission_key TEXT
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = p_user_id
      AND up.tenant_id = p_tenant_id
      AND up.permission_key = p_permission_key
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role = 'admin'
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User details
CREATE POLICY "user_details_select_own_or_admin" ON public.user_details
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_details_upsert_own" ON public.user_details
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_details_update_own" ON public.user_details
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_details_admin_all" ON public.user_details
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tenants
CREATE POLICY "tenants_read_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(id, auth.uid()));
CREATE POLICY "tenants_create" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tenant members
CREATE POLICY "members_read_self" ON public.tenant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
      OR public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));
CREATE POLICY "members_manage_by_owner" ON public.tenant_members
  FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));

-- Tenant config
CREATE POLICY "config_read" ON public.tenant_config
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "config_update" ON public.tenant_config
  FOR UPDATE TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));

-- Skills
CREATE POLICY "skills_read" ON public.skills
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "skills_manage" ON public.skills
  FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- Employees
CREATE POLICY "employees_read" ON public.employees
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "employees_manage" ON public.employees
  FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- Employee skills
CREATE POLICY "empskills_read" ON public.employee_skills
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id AND public.is_tenant_member(e.tenant_id, auth.uid())
  ));
CREATE POLICY "empskills_manage" ON public.employee_skills
  FOR ALL TO authenticated
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

-- Departments
CREATE POLICY "departments_read" ON public.departments
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "departments_manage" ON public.departments
  FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- Employee departments
CREATE POLICY "employee_departments_read" ON public.employee_departments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = (
      SELECT d.tenant_id FROM public.departments d WHERE d.id = employee_departments.department_id
    ))
  );
CREATE POLICY "employee_departments_manage" ON public.employee_departments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'manager') AND tm.tenant_id = (
      SELECT d.tenant_id FROM public.departments d WHERE d.id = employee_departments.department_id
    ))
  );

-- Shift templates
CREATE POLICY "templates_read" ON public.shift_templates
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "templates_manage" ON public.shift_templates
  FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- Shift assignments
CREATE POLICY "assignments_read" ON public.shift_assignments
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "assignments_manage" ON public.shift_assignments
  FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[]));

-- Shift swaps
CREATE POLICY "swaps_read" ON public.shift_swaps
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "swaps_insert_own" ON public.shift_swaps
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_member(tenant_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = requester_employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "swaps_update" ON public.shift_swaps
  FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[])
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = target_employee_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = requester_employee_id AND e.user_id = auth.uid())
  );

-- Leaves
CREATE POLICY "leaves_read" ON public.leaves
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = leaves.tenant_id)
  );
CREATE POLICY "leaves_insert" ON public.leaves
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = leaves.tenant_id)
  );
CREATE POLICY "leaves_update" ON public.leaves
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.user_permissions up WHERE up.user_id = auth.uid() AND up.tenant_id = leaves.tenant_id AND up.permission_key IN ('leaves.manage', 'leaves.manage_department'))
  );
CREATE POLICY "leaves_delete" ON public.leaves
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.user_permissions up WHERE up.user_id = auth.uid() AND up.tenant_id = leaves.tenant_id AND up.permission_key IN ('leaves.manage', 'leaves.manage_department'))
  );

-- Permissions catalog
CREATE POLICY "permissions_read_all" ON public.permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- User permissions
CREATE POLICY "user_permissions_select_self_or_admin" ON public.user_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_permissions.tenant_id
        AND up.permission_key = 'permissions.manage'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
CREATE POLICY "user_permissions_manage_admin" ON public.user_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_permissions.tenant_id
        AND up.permission_key = 'permissions.manage'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
CREATE POLICY "user_permissions_manage_admin_delete" ON public.user_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_permissions.tenant_id
        AND up.permission_key = 'permissions.manage'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Audit log
CREATE POLICY "audit_read_managers" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(), ARRAY['owner','manager']::public.tenant_role[]));
CREATE POLICY "audit_insert_members" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) AND user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_details_updated_at BEFORE UPDATE ON public.user_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
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
CREATE TRIGGER set_updated_at_leaves BEFORE UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_permissions BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_user_permissions BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bootstrap default config on new tenant
CREATE OR REPLACE FUNCTION public.init_tenant_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_config(tenant_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_init_tenant_config AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.init_tenant_config();

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_details (user_id) VALUES (NEW.id);

  IF NEW.email = 'alten.vsk@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    SELECT t.id, NEW.id, 'owner'
    FROM public.tenants t
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GRANTS (non-RLS)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- create_tenant_with_owner helper
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(_name TEXT, _slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.tenants(name, slug) VALUES (_name, _slug) RETURNING id INTO new_id;
  INSERT INTO public.tenant_members(tenant_id, user_id, role) VALUES (new_id, auth.uid(), 'owner');
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT) TO authenticated;
