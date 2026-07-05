import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

import { GlassPanel } from "@/components/GlassPanel";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { listEmployees } from "@/lib/employees.functions";
import { listDepartments } from "@/lib/departments.functions";
import { listRosterRange } from "@/lib/roster.functions";

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeTenantId, activeTenant } = useTenant();
  const name = user?.details?.first_name ?? user?.email?.split("@")[0] ?? "";

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);

  const employees = useQuery({
    queryKey: ["employees", activeTenantId],
    queryFn: () => listEmployees({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const departments = useQuery({
    queryKey: ["departments", activeTenantId],
    queryFn: () => listDepartments({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const roster = useQuery({
    queryKey: ["roster", activeTenantId, weekStart.toISOString()],
    queryFn: () =>
      listRosterRange({
        data: {
          tenant_id: activeTenantId!,
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
        },
      }),
    enabled: !!activeTenantId,
  });

  const now = new Date();
  const shiftsToday = (roster.data ?? []).filter(
    (a) => format(parseISO(a.actual_start_timestamp), "yyyy-MM-dd") === format(now, "yyyy-MM-dd"),
  );
  const upcoming = (roster.data ?? [])
    .filter((a) => parseISO(a.actual_start_timestamp) >= now)
    .slice(0, 5);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("dashboard.greeting", { name })}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTenant?.tenant_name ?? t("app.tagline")}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatCard label={t("staff.title")} value={employees.data?.length ?? 0} />
        <StatCard label={t("departments.title")} value={departments.data?.length ?? 0} />
        <StatCard label={t("dashboard.staffOnShift")} value={shiftsToday.length} />
        <StatCard label={t("roster.week")} value={roster.data?.length ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-6">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
            {t("shifts.next")}
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground">{t("shifts.noneScheduled")}</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {upcoming.map((a) => {
                const emp = a.employees as { first_name: string; last_name: string } | null;
                const dep = a.departments as { department_name: string; color_code: string } | null;
                return (
                  <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">
                        {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dep?.department_name ?? ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(a.actual_start_timestamp), "EEE d, HH:mm")}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel className="p-6">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">
            {t("roster.week")}
          </h2>
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((d) => {
              const count = (roster.data ?? []).filter(
                (a) =>
                  format(parseISO(a.actual_start_timestamp), "yyyy-MM-dd") ===
                  format(d, "yyyy-MM-dd"),
              ).length;
              return (
                <div
                  key={d.toISOString()}
                  className="rounded-md bg-background/40 border border-border/40 py-2"
                >
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {format(d, "EEE")}
                  </div>
                  <div className="text-lg font-semibold">{count}</div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <GlassPanel className="p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-3xl font-semibold">{value}</div>
  </GlassPanel>
);