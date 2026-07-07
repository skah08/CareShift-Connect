import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTenant } from "@/hooks/useTenant";
import { usePermissions } from "@/hooks/usePermissions";
import { listEmployees } from "@/lib/employees.functions";
import {
  listUserPermissions,
  grantPermission,
  revokePermission,
} from "@/lib/permissions.functions";
import {
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
} from "@/interfaces/Permission";

export function PermissionsPage() {
  const { t } = useTranslation();
  const { activeTenantId } = useTenant();
  const { superAdmin, permissions } = usePermissions();
  const qc = useQueryClient();

  const canManage = superAdmin || permissions.permissions_manage;

  const employeesQ = useQuery({
    queryKey: ["employees", activeTenantId],
    queryFn: () => listEmployees({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const userPermsQ = useQuery({
    queryKey: ["user_permissions", activeTenantId],
    queryFn: () => listUserPermissions({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const grantMut = useMutation({
    mutationFn: grantPermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_permissions", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const revokeMut = useMutation({
    mutationFn: revokePermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_permissions", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const permSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of userPermsQ.data ?? []) {
      set.add(`${p.user_id}:${p.permission_key}`);
    }
    return set;
  }, [userPermsQ.data]);

  const employees = useMemo(() => {
    return ((employeesQ.data ?? []).filter((e: any) => e.user_id != null) as any[]) as Array<{ id: string; user_id: string; first_name: string; last_name: string; email: string }>;
  }, [employeesQ.data]);

  const hasPerm = (userId: string, key: string) => permSet.has(`${userId}:${key}`);

  const toggle = (userId: string, key: string, current: boolean) => {
    if (!activeTenantId) return;
    if (current) {
      revokeMut.mutate({
        data: { user_id: userId, tenant_id: activeTenantId, permission_key: key },
      });
    } else {
      grantMut.mutate({
        data: { user_id: userId, tenant_id: activeTenantId, permission_key: key },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("permissions.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("permissions.subtitle")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border/40">
              <th className="text-left px-4 py-3 font-medium min-w-[180px]">
                {t("permissions.user")}
              </th>
              {Object.entries(PERMISSION_CATEGORIES).map(([cat, perms]) => (
                <th
                  key={cat}
                  colSpan={perms.length}
                  className="text-center px-2 py-3 font-medium text-xs uppercase text-muted-foreground border-l border-border/40"
                >
                  {t(`permissions.categories.${cat}`)}
                </th>
              ))}
            </tr>
            <tr className="bg-muted/20 border-b border-border/40">
              <th className="px-4 py-2" />
              {ALL_PERMISSIONS.map((key) => (
                <th
                  key={key}
                  className="text-center px-1 py-2 text-[10px] font-normal text-muted-foreground border-l border-border/40 whitespace-nowrap"
                >
                  {t(`permissions.labels.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-border/20 hover:bg-muted/10">
                <td className="px-4 py-2.5 font-medium">
                  {emp.first_name} {emp.last_name}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {emp.email}
                  </span>
                </td>
                {ALL_PERMISSIONS.map((key) => {
                  const checked = hasPerm(emp.user_id, key);
                  return (
                    <td
                      key={key}
                      className="text-center px-1 py-2.5 border-l border-border/20"
                    >
                      <label className="flex items-center justify-center min-h-11 min-w-11 cursor-pointer disabled:cursor-not-allowed">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canManage}
                          onChange={() => toggle(emp.user_id, key, checked)}
                          className="size-4 accent-primary pointer-events-none disabled:opacity-40"
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
