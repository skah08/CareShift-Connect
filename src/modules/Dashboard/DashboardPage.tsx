import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

import { GlassPanel } from "@/components/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { getDashboardData } from "@/lib/dashboard.functions";
import { getPendingSwapRequests } from "@/lib/swaps.functions";

type PermissionKey =
  | "calendar_view" | "calendar_manage" | "calendar_manage_department"
  | "employees_view" | "employees_manage"
  | "departments_view" | "departments_manage"
  | "leaves_manage" | "leaves_manage_department"
  | "swaps_approve" | "permissions_manage" | "reports_view";

const ALL_PERMS = new Set<PermissionKey>([
  "calendar_view", "calendar_manage", "calendar_manage_department",
  "employees_view", "employees_manage",
  "departments_view", "departments_manage",
  "leaves_manage", "leaves_manage_department",
  "swaps_approve", "permissions_manage", "reports_view",
]);

function isSuperAdmin(userRoles: string[] | undefined, tenantRole: string | undefined) {
  if (userRoles?.includes("admin")) return true;
  if (tenantRole === "owner") return true;
  return false;
}

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeTenantId, activeTenant } = useTenant();

  const userRoles = user?.roles ?? [];
  const tenantRole = activeTenant?.role;
  const superAdmin = isSuperAdmin(userRoles, tenantRole);
  const name = user?.details?.first_name ?? user?.email?.split("@")[0] ?? "";

  const now = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now]);
  const weekEnd = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), [now]);
  const todayKey = useMemo(() => format(now, "yyyy-MM-dd"), [now]);

  const batch = useQuery({
    queryKey: ["dash", activeTenantId, weekStart.toISOString()],
    queryFn: () =>
      getDashboardData({
        data: {
          tenant_id: activeTenantId!,
          week_from: weekStart.toISOString(),
          week_to: weekEnd.toISOString(),
        },
      }),
    enabled: !!activeTenantId,
  });

  const userId = user?.id;

  const canManage = useMemo(() => {
    if (superAdmin) return true;
    if (!batch.data?.permissions || !userId) return false;
    return batch.data.permissions.some(
      (p) => p.user_id === userId && p.permission_key === "permissions.manage",
    );
  }, [superAdmin, batch.data?.permissions, userId]);

  const pendingSwaps = useQuery({
    queryKey: ["pendingSwaps", activeTenantId],
    queryFn: () => getPendingSwapRequests({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId && canManage,
    refetchInterval: 30_000,
  });

  const employees = batch.data?.employees ?? [];
  const departments = batch.data?.departments ?? [];
  const roster = batch.data?.roster ?? [];
  const leaves = batch.data?.leaves ?? [];
  const employeeDepts = batch.data?.employeeDepartments ?? [];

  const shiftsToday = useMemo(
    () => roster.filter((a) => format(parseISO(a.actual_start_timestamp), "yyyy-MM-dd") === todayKey),
    [roster, todayKey],
  );

  const onLeaveToday = useMemo(
    () => leaves.filter((l) => l.start_date <= todayKey && l.end_date >= todayKey),
    [leaves, todayKey],
  );

  const currentEmployee = useMemo(
    () => employees.find((e) => e.email === user?.email) ?? null,
    [employees, user?.email],
  );

  const myShifts = useMemo(
    () =>
      roster
        .filter(
          (a) =>
            currentEmployee &&
            a.employee_id === currentEmployee.id &&
            parseISO(a.actual_start_timestamp) >= now,
        )
        .slice(0, 3),
    [roster, currentEmployee, now],
  );

  const deptEmpCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const ed of employeeDepts) {
      map.set(ed.department_id, (map.get(ed.department_id) ?? 0) + 1);
    }
    return map;
  }, [employeeDepts]);

  const deptScheduledToday = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shiftsToday) {
      map.set(s.department_id, (map.get(s.department_id) ?? 0) + 1);
    }
    return map;
  }, [shiftsToday]);

  const deptCoverage = useMemo(
    () =>
      departments.map((d) => ({
        ...d,
        total: deptEmpCount.get(d.id) ?? 0,
        scheduled: deptScheduledToday.get(d.id) ?? 0,
      })),
    [departments, deptEmpCount, deptScheduledToday],
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            {t("dashboard.greeting", { name })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTenant?.tenant_name ?? t("app.tagline")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(now, "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <Badge variant={canManage ? "default" : "secondary"}>
          {canManage ? t("dashboard.admin") : tenantRole ?? "staff"}
        </Badge>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        <StatCard label={t("staff.title")} value={employees.length} />
        <StatCard label={t("departments.title")} value={departments.length} />
        <StatCard label={t("dashboard.onShiftToday")} value={shiftsToday.length} />
        <StatCard label={t("dashboard.onLeaveToday")} value={onLeaveToday.length} />
        <StatCard label={t("dashboard.shiftsThisWeek")} value={roster.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-6">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
            {t("dashboard.departmentCoverage")}
          </h2>
          {deptCoverage.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("departments.empty")}</p>
          ) : (
            <div className="space-y-4">
              {deptCoverage.map((d) => {
                const pct = d.total > 0 ? Math.round((d.scheduled / d.total) * 100) : 0;
                const color =
                  pct === 0
                    ? "bg-destructive"
                    : pct < 50
                      ? "bg-orange-500"
                      : pct < 80
                        ? "bg-yellow-500"
                        : "bg-emerald-500";
                return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{d.department_name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {d.scheduled}/{d.total}
                        <span className="ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-background/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${color}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-6">
            <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
              {t("dashboard.onLeaveToday")}
            </h2>
            {onLeaveToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noOneOnLeave")}</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {onLeaveToday.slice(0, 6).map((l) => {
                  const emp = employees.find((e) => e.id === l.employee_id);
                  return (
                    <li key={l.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {l.leave_type}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            {!onLeaveToday.length && leaves.length > 0 && (
              <details className="mt-1">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {t("dashboard.laterThisWeek")} ({leaves.length})
                </summary>
                <ul className="divide-y divide-border/50 mt-1 max-h-40 overflow-y-auto">
                  {leaves.map((l) => {
                    const emp = employees.find((e) => e.id === l.employee_id);
                    return (
                      <li key={l.id} className="py-1.5 flex items-center justify-between text-xs">
                        <span>
                          {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                          <span className="text-muted-foreground ml-1">
                            {format(parseISO(l.start_date), "d MMM")}–{format(parseISO(l.end_date), "d MMM")}
                          </span>
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {l.leave_type}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}

            {myShifts.length > 0 && (
              <>
                <div className="border-t border-border/40 my-3" />
                <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  {t("dashboard.myNextShifts")}
                </h2>
                <ul className="divide-y divide-border/50">
                  {myShifts.map((a) => {
                    const dep = a.departments as { department_name: string } | null;
                    const tmpl = a.shift_templates as { shift_code: string } | null;
                    return (
                      <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">
                            {tmpl ? `${tmpl.shift_code} · ${t(`templates.codes.${tmpl.shift_code}`, tmpl.shift_code)}` : t("dashboard.shiftFallback")}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {dep?.department_name ?? ""}
                          </span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {format(parseISO(a.actual_start_timestamp), "EEE d, HH:mm")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {!myShifts.length && currentEmployee && (
              <>
                <div className="border-t border-border/40 my-3" />
                <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  {t("dashboard.myNextShifts")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("dashboard.noUpcomingShifts")}</p>
              </>
            )}
          </GlassPanel>

          {canManage && pendingSwaps.data && pendingSwaps.data.length > 0 && (
            <GlassPanel className="p-6">
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
                {t("dashboard.changeRequests")}
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {pendingSwaps.data.length} {t("dashboard.pending")}
                </Badge>
              </h2>
              <ul className="divide-y divide-border/50">
                {pendingSwaps.data.map((s) => {
                  const barWidth = Math.max(s.priority_score * 100, 8);
                  return (
                    <li key={s.id} className="py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">
                            {s.requester
                              ? `${s.requester.first_name} ${s.requester.last_name}`
                              : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1.5">
                            → {s.target
                              ? `${s.target.first_name} ${s.target.last_name}`
                              : "open"}
                          </span>
                        </div>
                        <Badge
                          variant={s.status === "Pending_Manager" ? "secondary" : "outline"}
                          className="text-[10px] shrink-0 ml-2"
                        >
                          {s.status === "Pending_Peer"
                            ? t("dashboard.awaitingPeer")
                            : t("dashboard.awaitingYou")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-background/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                          {s.requester_request_count === 1
                            ? t("dashboard.firstRequest")
                            : `${s.requester_request_count} ${t("dashboard.requests")}`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </GlassPanel>
          )}
        </div>
      </div>

      <GlassPanel className="p-6">
        <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
          {t("dashboard.thisWeek")}
        </h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const count = roster.filter(
              (a) => format(parseISO(a.actual_start_timestamp), "yyyy-MM-dd") === key,
            ).length;
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`rounded-lg border py-3 transition-colors ${
                  isToday
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border/40 bg-background/40"
                }`}
              >
                <div className="text-[10px] uppercase text-muted-foreground">
                  {format(d, "EEE")}
                </div>
                <div className="text-lg font-semibold">{count}</div>
                <div className="text-[10px] text-muted-foreground">
                  {format(d, "d MMM")}
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <GlassPanel className="p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
  </GlassPanel>
);
