-- Shift proposal/approval workflow for staff

-- -- 1. Add Staff_Proposed to assignment_status enum
-- ALTER TYPE public.assignment_status ADD VALUE IF NOT EXISTS 'Staff_Proposed' AFTER 'Scheduled';

-- 2. Staff can propose shifts for themselves (INSERT only)
--    The WITH CHECK ensures staff can only propose shifts where:
--    - status is Staff_Proposed
--    - employee_id matches their own employee record
--    - department_id matches one of their assigned departments
CREATE POLICY "assignments_staff_propose" ON public.shift_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    assignment_status = 'Staff_Proposed'::public.assignment_status
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
        AND e.user_id = auth.uid()
        AND e.tenant_id = shift_assignments.tenant_id
    )
    AND EXISTS (
      SELECT 1 FROM public.employee_departments ed
      WHERE ed.employee_id = shift_assignments.employee_id
        AND ed.department_id = shift_assignments.department_id
    )
  );

-- 3. Staff can update/delete their own Staff_Proposed shifts (cancel/edit before approval)
CREATE POLICY "assignments_staff_manage_own_proposals" ON public.shift_assignments
  FOR ALL TO authenticated
  USING (
    assignment_status = 'Staff_Proposed'::public.assignment_status
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
        AND e.user_id = auth.uid()
        AND e.tenant_id = shift_assignments.tenant_id
    )
  )
  WITH CHECK (
    assignment_status = 'Staff_Proposed'::public.assignment_status
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
        AND e.user_id = auth.uid()
        AND e.tenant_id = shift_assignments.tenant_id
    )
  );

-- 4. Helper: list pending shift proposals for the current user's tenant(s)
CREATE OR REPLACE FUNCTION public.list_pending_shift_proposals(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  employee_id UUID,
  employee_name TEXT,
  department_id UUID,
  department_name TEXT,
  shift_template_id UUID,
  shift_code TEXT,
  shift_date DATE,
  actual_start_timestamp TIMESTAMPTZ,
  actual_end_timestamp TIMESTAMPTZ,
  coverage_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sa.id,
    sa.employee_id,
    (e.first_name || ' ' || e.last_name)::TEXT AS employee_name,
    sa.department_id,
    d.department_name AS department_name,
    sa.shift_template_id,
    st.shift_code,
    sa.shift_date,
    sa.actual_start_timestamp,
    sa.actual_end_timestamp,
    sa.coverage_type::TEXT,
    sa.notes,
    sa.created_at
  FROM public.shift_assignments sa
  JOIN public.employees e ON e.id = sa.employee_id
  JOIN public.departments d ON d.id = sa.department_id
  LEFT JOIN public.shift_templates st ON st.id = sa.shift_template_id
  WHERE sa.tenant_id = p_tenant_id
    AND sa.assignment_status = 'Staff_Proposed'::public.assignment_status
  ORDER BY sa.created_at DESC;
$$;

-- 5. Approve a shift proposal: change status to Approved
CREATE OR REPLACE FUNCTION public.approve_shift_proposal(
  p_assignment_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.shift_assignments
  WHERE id = p_assignment_id AND assignment_status = 'Staff_Proposed'::public.assignment_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift proposal not found or already processed';
  END IF;

  IF NOT public.has_tenant_role(v_tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[])
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins, owners, managers, or planners can approve shift proposals';
  END IF;

  UPDATE public.shift_assignments
  SET assignment_status = 'Approved'::public.assignment_status,
      notes = COALESCE(p_review_notes, notes)
  WHERE id = p_assignment_id;
END;
$$;

-- 6. Reject (delete) a shift proposal
CREATE OR REPLACE FUNCTION public.reject_shift_proposal(
  p_assignment_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.shift_assignments
  WHERE id = p_assignment_id AND assignment_status = 'Staff_Proposed'::public.assignment_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift proposal not found or already processed';
  END IF;

  IF NOT public.has_tenant_role(v_tenant_id, auth.uid(), ARRAY['owner','manager','planner']::public.tenant_role[])
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins, owners, managers, or planners can reject shift proposals';
  END IF;

  DELETE FROM public.shift_assignments WHERE id = p_assignment_id;
END;
$$;
