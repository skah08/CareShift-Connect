-- Fix list_departments_for_approval: column is department_name, not name

CREATE OR REPLACE FUNCTION public.list_departments_for_approval(p_tenant_id UUID)
RETURNS TABLE (id UUID, name TEXT, cost_center_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT d.id, d.department_name AS name, d.cost_center_code
  FROM public.departments d
  WHERE d.tenant_id = p_tenant_id
  ORDER BY d.department_name ASC;
$$;
