-- Drop existing recursive policies on user_permissions.
-- The SELECT policy queried user_permissions from within an EXISTS subquery,
-- which triggered the same policy again → infinite recursion.
DROP POLICY IF EXISTS "user_permissions_select_self_or_admin" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_manage_admin" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_manage_admin_delete" ON public.user_permissions;

-- Recreate using has_permission() (SECURITY DEFINER) to break the recursion.
CREATE POLICY "user_permissions_select_self_or_admin" ON public.user_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    public.has_permission(auth.uid(), user_permissions.tenant_id, 'permissions.manage')
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_permissions_manage_admin_insert" ON public.user_permissions
  FOR INSERT WITH CHECK (
    public.has_permission(auth.uid(), user_permissions.tenant_id, 'permissions.manage')
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_permissions_manage_admin_delete" ON public.user_permissions
  FOR DELETE USING (
    public.has_permission(auth.uid(), user_permissions.tenant_id, 'permissions.manage')
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
