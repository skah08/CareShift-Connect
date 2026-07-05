import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { listUserPermissions } from "@/lib/permissions.functions";
import type { PermissionKey } from "@/interfaces/Permission";

interface PermissionsMap {
  calendar_view: boolean;
  calendar_manage: boolean;
  calendar_manage_department: boolean;
  employees_view: boolean;
  employees_manage: boolean;
  departments_view: boolean;
  departments_manage: boolean;
  leaves_manage: boolean;
  leaves_manage_department: boolean;
  swaps_approve: boolean;
  permissions_manage: boolean;
  reports_view: boolean;
}

const EMPTY_PERMS: PermissionsMap = {
  calendar_view: false,
  calendar_manage: false,
  calendar_manage_department: false,
  employees_view: false,
  employees_manage: false,
  departments_view: false,
  departments_manage: false,
  leaves_manage: false,
  leaves_manage_department: false,
  swaps_approve: false,
  permissions_manage: false,
  reports_view: false,
};

function toKey(key: PermissionKey): keyof PermissionsMap {
  return key.replace(/\./g, "_") as keyof PermissionsMap;
}

/** True se l'utente ha implicitamente tutti i permessi (admin app_role o owner tenant_role) */
function isSuperAdmin(
  userRoles: string[] | undefined,
  tenantRole: string | undefined,
): boolean {
  if (userRoles?.includes("admin")) return true;
  if (tenantRole === "owner") return true;
  return false;
}

export function usePermissions() {
  const { user } = useAuth();
  const { activeTenantId, activeTenant } = useTenant();

  const userRoles = user?.roles ?? [];
  const tenantRole = activeTenant?.role;
  const superAdmin = isSuperAdmin(userRoles, tenantRole);

  const query = useQuery({
    queryKey: ["user_permissions", activeTenantId, user?.id],
    queryFn: () =>
      listUserPermissions({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId && !!user?.id,
  });

  const permissions = useMemo<PermissionsMap>(() => {
    if (superAdmin) {
      const all = { ...EMPTY_PERMS } as any;
      for (const key of Object.keys(EMPTY_PERMS)) {
        all[key] = true;
      }
      return all as PermissionsMap;
    }
    if (!query.data) return EMPTY_PERMS;

    const perms = { ...EMPTY_PERMS };
    for (const row of query.data) {
      const key = toKey(row.permission_key as PermissionKey);
      if (key in perms) {
        (perms as any)[key] = true;
      }
    }

    return perms;
  }, [superAdmin, query.data]);

  return {
    permissions,
    superAdmin,
    loading: query.isLoading,
  };
}
