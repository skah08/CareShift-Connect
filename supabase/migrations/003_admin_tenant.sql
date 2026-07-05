-- Admin tenant management: delete_tenant RPC

CREATE OR REPLACE FUNCTION public.delete_tenant(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin  BOOLEAN;
  is_owner  BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id AND user_id = auth.uid() AND role = 'owner'
  ) INTO is_owner;

  IF NOT is_admin AND NOT is_owner THEN
    RAISE EXCEPTION 'Only admins or tenant owners can delete a tenant';
  END IF;

  DELETE FROM public.tenants WHERE id = _tenant_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tenant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant(UUID) TO authenticated;

-- Admin list: all tenants
CREATE OR REPLACE FUNCTION public.list_all_tenants()
RETURNS TABLE(id UUID, name TEXT, slug TEXT, created_at TIMESTAMPTZ, member_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can list all tenants';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.created_at,
    (SELECT COUNT(*) FROM public.tenant_members tm WHERE tm.tenant_id = t.id)::BIGINT AS member_count
  FROM public.tenants t
  ORDER BY t.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_all_tenants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_all_tenants() TO authenticated;
