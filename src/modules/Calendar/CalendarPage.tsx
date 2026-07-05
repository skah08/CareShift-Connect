import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, UserSearch, Umbrella } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { listEmployees } from "@/lib/employees.functions";
import { listDepartments } from "@/lib/departments.functions";
import { listShiftTemplates } from "@/lib/shiftTemplates.functions";
import {
  deleteAssignment,
  evaluateAssignment,
  findReplacements,
  listRosterRange,
  upsertAssignment,
  type ReplacementCandidate,
} from "@/lib/roster.functions";
import type { ComplianceReport } from "@/lib/compliance/types";
import { listLeaves, upsertLeave, deleteLeave } from "@/lib/leaves.functions";
import { MonthView } from "./MonthView";

type AssignmentRow = Awaited<ReturnType<typeof listRosterRange>>[number];

type CoverageType = "Regular_Shift" | "On_Call_Active" | "On_Call_Passive" | "Mandatory_Overtime";

type ViewMode = "week" | "month";

interface DialogState {
  id?: string;
  employee_id: string;
  department_id: string;
  shift_template_id: string | null;
  start: string;
  end: string;
  coverage_type: CoverageType;
  notes: string;
}

const toLocalInput = (d: Date) =>
  format(d, "yyyy-MM-dd'T'HH:mm");

const emptyDialog = (day: Date): DialogState => ({
  employee_id: "",
  department_id: "",
  shift_template_id: null,
  start: toLocalInput(new Date(day.setHours(8, 0, 0, 0))),
  end: toLocalInput(new Date(day.setHours(16, 0, 0, 0))),
  coverage_type: "Regular_Shift",
  notes: "",
});

export const CalendarPage = () => {
  const { t } = useTranslation();
  const { activeTenantId, activeTenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [anchor, setAnchor] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [myShiftsOnly, setMyShiftsOnly] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([]);

  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);
  const monthGridStart = useMemo(() => startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }), [anchor]);
  const monthGridEnd = useMemo(() => endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), [anchor]);
  const viewStart = useMemo(() => viewMode === "week" ? weekStart : monthGridStart, [viewMode, weekStart, monthGridStart]);
  const viewEnd = useMemo(() => viewMode === "week" ? weekEnd : monthGridEnd, [viewMode, weekEnd, monthGridEnd]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

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
  const templates = useQuery({
    queryKey: ["templates", activeTenantId],
    queryFn: () => listShiftTemplates({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const roster = useQuery({
    queryKey: ["roster", activeTenantId, viewStart.toISOString(), viewEnd.toISOString()],
    queryFn: () =>
      listRosterRange({
        data: {
          tenant_id: activeTenantId!,
          from: viewStart.toISOString(),
          to: viewEnd.toISOString(),
        },
      }),
    enabled: !!activeTenantId,
  });

  const leaves = useQuery({
    queryKey: ["leaves", activeTenantId, viewStart.toISOString(), viewEnd.toISOString()],
    queryFn: () =>
      listLeaves({
        data: {
          tenant_id: activeTenantId!,
          from: viewStart.toISOString(),
          to: viewEnd.toISOString(),
        },
      }),
    enabled: !!activeTenantId,
  });

  const currentEmployee = useMemo(() => {
    if (!user?.email) return null;
    return (employees.data ?? []).find((e) => e.email === user.email) ?? null;
  }, [employees.data, user?.email]);

  const { permissions, superAdmin } = usePermissions();
  const tenantRole = activeTenant?.role;
  const canManageAll = superAdmin || permissions.calendar_manage;
  const canManageShifts = canManageAll || permissions.calendar_manage_department;

  const currentEmployeeDeptIds = useMemo(() => {
    if (!currentEmployee) return [] as string[];
    const deptSet = new Set<string>();
    for (const a of roster.data ?? []) {
      if (a.employee_id === currentEmployee.id) deptSet.add(a.department_id);
    }
    return [...deptSet];
  }, [currentEmployee, roster.data]);

  const departmentOptions: MultiSelectOption[] = useMemo(
    () => (departments.data ?? []).map((d) => ({ value: d.id, label: d.department_name })),
    [departments.data],
  );
  const employeeOptions: MultiSelectOption[] = useMemo(
    () =>
      (employees.data ?? []).map((e) => ({
        value: e.id,
        label: `${e.first_name} ${e.last_name}`,
      })),
    [employees.data],
  );

  const filteredAssignments = useMemo(() => {
    let items = roster.data ?? [];

    if (viewMode === "week") {
      items = items.filter((a) => {
        const d = parseISO(a.actual_start_timestamp);
        return d >= weekStart && d <= weekEnd;
      });
    }

    if (departmentFilter.length > 0) {
      items = items.filter((a) => departmentFilter.includes(a.department_id));
    }

    if (!canManageAll && currentEmployeeDeptIds.length > 0) {
      items = items.filter((a) => currentEmployeeDeptIds.includes(a.department_id));
    }

    if (myShiftsOnly && currentEmployee) {
      items = items.filter((a) => a.employee_id === currentEmployee.id);
    } else if (employeeFilter.length > 0) {
      items = items.filter((a) => employeeFilter.includes(a.employee_id));
    }

    return items;
  }, [roster.data, viewMode, weekStart, weekEnd, departmentFilter, myShiftsOnly, currentEmployee, employeeFilter, canManageAll, currentEmployeeDeptIds]);

  const assignmentsByDay = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    for (const a of filteredAssignments) {
      const key = format(parseISO(a.actual_start_timestamp), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [filteredAssignments]);

  const leavesInWeek = useMemo(() => {
    return (leaves.data ?? [])
      .filter((l: any) => {
        const ls = parseISO(l.start_date);
        const le = parseISO(l.end_date);
        return ls <= weekEnd && le >= weekStart;
      })
      .map((l: any) => {
        const ls = parseISO(l.start_date);
        const le = parseISO(l.end_date);
        const vs = maxDate([ls, weekStart]);
        const ve = minDate([le, weekEnd]);
        const startIdx = differenceInCalendarDays(vs, weekStart);
        const endIdx = differenceInCalendarDays(ve, weekStart);
        return { ...l, startIdx, endIdx };
      });
  }, [leaves.data, weekStart, weekEnd]);

  const leavesByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const l of leaves.data ?? []) {
      const ls = parseISO(l.start_date);
      const le = parseISO(l.end_date);
      let cur = ls;
      while (cur <= le) {
        const key = format(cur, "yyyy-MM-dd");
        const arr = map.get(key) ?? [];
        arr.push(l);
        map.set(key, arr);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [leaves.data]);

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [candidates, setCandidates] = useState<ReplacementCandidate[] | null>(null);
  const [leaveDialog, setLeaveDialog] = useState<{
    id?: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    leave_type: string;
    reason: string;
  } | null>(null);

  const goBack = () => {
    setAnchor(viewMode === "week" ? addWeeks(anchor, -1) : addMonths(anchor, -1));
  };
  const goForward = () => {
    setAnchor(viewMode === "week" ? addWeeks(anchor, 1) : addMonths(anchor, 1));
  };
  const goToday = () => setAnchor(new Date());

  const upsertMut = useMutation({
    mutationFn: async (d: DialogState) => {
      if (!activeTenantId) throw new Error("No tenant");
      const start = new Date(d.start);
      const end = new Date(d.end);
      const res = await upsertAssignment({
        data: {
          tenant_id: activeTenantId,
          id: d.id,
          employee_id: d.employee_id,
          department_id: d.department_id,
          shift_template_id: d.shift_template_id,
          shift_date: format(start, "yyyy-MM-dd"),
          actual_start_timestamp: start.toISOString(),
          actual_end_timestamp: end.toISOString(),
          coverage_type: d.coverage_type,
          notes: d.notes || null,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      setReport(res.report);
      if (res.ok) {
        toast.success(t("common.save"));
        setDialog(null);
        qc.invalidateQueries({ queryKey: ["roster", activeTenantId] });
      } else {
        toast.error(t("roster.hardIssues"));
      }
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const evalMut = useMutation({
    mutationFn: async (d: DialogState) => {
      if (!activeTenantId) throw new Error("No tenant");
      return evaluateAssignment({
        data: {
          tenant_id: activeTenantId,
          employee_id: d.employee_id,
          shift_template_id: d.shift_template_id ?? null,
          actual_start_timestamp: new Date(d.start).toISOString(),
          actual_end_timestamp: new Date(d.end).toISOString(),
          ignore_assignment_id: d.id,
        },
      });
    },
    onSuccess: (r) => setReport(r),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      if (!activeTenantId) throw new Error("No tenant");
      return deleteAssignment({ data: { tenant_id: activeTenantId, id } });
    },
    onSuccess: () => {
      toast.success(t("roster.delete"));
      setDialog(null);
      qc.invalidateQueries({ queryKey: ["roster", activeTenantId] });
    },
  });

  const findMut = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!activeTenantId) throw new Error("No tenant");
      return findReplacements({
        data: { tenant_id: activeTenantId, assignment_id: assignmentId },
      });
    },
    onSuccess: (res) => setCandidates(res),
  });

  const leaveMut = useMutation({
    mutationFn: async (d: NonNullable<typeof leaveDialog>) => {
      if (!activeTenantId) throw new Error("No tenant");
      return upsertLeave({
        data: {
          tenant_id: activeTenantId,
          id: d.id,
          employee_id: d.employee_id,
          start_date: d.start_date,
          end_date: d.end_date,
          leave_type: d.leave_type as any,
          reason: d.reason,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("common.save"));
      setLeaveDialog(null);
      qc.invalidateQueries({ queryKey: ["leaves", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const openNew = (day: Date) => {
    setReport(null);
    setCandidates(null);
    setDialog(emptyDialog(new Date(day)));
  };

  const openEdit = (a: AssignmentRow) => {
    setReport(null);
    setCandidates(null);
    setDialog({
      id: a.id,
      employee_id: a.employee_id,
      department_id: a.department_id,
      shift_template_id: a.shift_template_id,
      start: toLocalInput(parseISO(a.actual_start_timestamp)),
      end: toLocalInput(parseISO(a.actual_end_timestamp)),
      coverage_type: (a.coverage_type ?? "Regular_Shift") as CoverageType,
      notes: a.notes ?? "",
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!dialog || !canManageShifts) return;
    upsertMut.mutate(dialog);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("calendar.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === "week"
              ? `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`
              : `${format(startOfMonth(anchor), "MMMM yyyy")}`}
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center rounded-md border border-input bg-background shadow-sm">
            <button
              className={`px-2 sm:px-3 min-h-11 md:min-h-9 text-xs sm:text-sm font-medium cursor-pointer rounded-l-md transition-colors ${
                viewMode === "week" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
              onClick={() => setViewMode("week")}
            >
              {t("calendar.viewWeek")}
            </button>
            <button
              className={`px-2 sm:px-3 min-h-11 md:min-h-9 text-xs sm:text-sm font-medium cursor-pointer rounded-r-md transition-colors ${
                viewMode === "month" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
              onClick={() => setViewMode("month")}
            >
              {t("calendar.viewMonth")}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={goBack} className="min-h-11 min-w-11 md:min-h-9 md:min-w-9">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="min-h-11 md:min-h-9 px-2 sm:px-3 text-xs sm:text-sm">
            {t("roster.today")}
          </Button>
          <Button variant="outline" size="sm" onClick={goForward} className="min-h-11 min-w-11 md:min-h-9 md:min-w-9">
            <ChevronRight className="size-4" />
          </Button>
          {canManageAll ? (
            <Button variant="outline" size="sm" onClick={() => {
              const today = new Date();
              setLeaveDialog({ employee_id: "", start_date: format(today, "yyyy-MM-dd"), end_date: format(today, "yyyy-MM-dd"), leave_type: "Annual", reason: "" });
            }} className="min-h-11 md:min-h-9">
              <Umbrella className="size-4 mr-1.5" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          ) : (
            <span className="hidden sm:inline" />
          )}
          <Badge variant={canManageAll ? "default" : "secondary"} className="text-[10px] gap-1 shrink-0">
            {canManageAll ? "Admin" : tenantRole ?? "staff"}
            {!canManageAll && currentEmployee && (
              <span className="opacity-70">· {currentEmployee.primary_role?.replace(/_/g, " ")}</span>
            )}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">{t("calendar.filterDepartment")}</Label>
          <MultiSelect
            options={departmentOptions}
            selected={departmentFilter}
            onChange={setDepartmentFilter}
            placeholder={t("shifts.department")}
            className="min-w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">{t("calendar.filterEmployees")}</Label>
          <MultiSelect
            options={employeeOptions}
            selected={employeeFilter}
            onChange={setEmployeeFilter}
            placeholder={t("staff.title")}
            className="min-w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="my-shifts"
            checked={myShiftsOnly}
            onCheckedChange={setMyShiftsOnly}
          />
          <Label htmlFor="my-shifts" className="text-xs cursor-pointer">
            {t("calendar.filterMyShifts")}
          </Label>
        </div>
      </div>

      <GlassPanel className="p-3">
        {viewMode === "week" ? (
          <>
            {/* Desktop: 7-column grid */}
            <div className="hidden md:grid md:grid-cols-7 md:gap-2" style={{ gridTemplateRows: "auto 1fr" }}>
              {/* Multi-day leave bars */}
              {leavesInWeek.map((l: any) => {
                const emp = (employees.data ?? []).find((e: any) => e.id === l.employee_id);
                const empName = emp ? `${emp.first_name} ${emp.last_name}` : "—";
                const colStart = Math.max(0, l.startIdx) + 1;
                const colEnd = Math.min(6, l.endIdx) + 2;
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      gridColumn: `${colStart} / ${colEnd}`,
                      gridRow: 1,
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      color: "#fff",
                      borderTopLeftRadius: colStart === l.startIdx + 1 ? undefined : 0,
                      borderBottomLeftRadius: colStart === l.startIdx + 1 ? undefined : 0,
                      borderTopRightRadius: colEnd === l.endIdx + 2 ? undefined : 0,
                      borderBottomRightRadius: colEnd === l.endIdx + 2 ? undefined : 0,
                    }}
                    title={`${empName} · ${l.leave_type}${l.reason ? ` · ${l.reason}` : ""}`}
                    onClick={() => setLeaveDialog({
                      id: l.id,
                      employee_id: l.employee_id,
                      start_date: l.start_date,
                      end_date: l.end_date,
                      leave_type: l.leave_type,
                      reason: l.reason ?? "",
                    })}
                  >
                    <Umbrella className="size-3.5 shrink-0" />
                    <span className="truncate">{empName}</span>
                    <span className="opacity-70 text-[10px] hidden 2xl:inline">{l.leave_type}</span>
                  </div>
                );
              })}
              {/* Day columns */}
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const dayAssignments = assignmentsByDay.get(key) ?? [];
                const isToday = isSameDay(d, new Date());
                return (
                  <div
                    key={key}
                    className={`rounded-lg border border-border/40 bg-background/40 min-h-64 flex flex-col ${
                      isToday ? "ring-1 ring-primary" : ""
                    }`}
                    style={{ gridRow: 2 }}
                  >
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {format(d, "EEE")}
                        </div>
                        <div className="text-sm font-semibold">{format(d, "d MMM")}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => canManageShifts ? openNew(d) : undefined} disabled={!canManageShifts}>
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <div className="p-1.5 space-y-1 flex-1 overflow-y-auto">
                      {dayAssignments.map((a) => {
                        const dep = a.departments as { department_name: string; color_code: string } | null;
                        const emp = a.employees as { first_name: string; last_name: string; primary_role: string } | null;
                        const tmpl = a.shift_templates as { shift_code: string } | null;
                        return (
                          <button
                            key={a.id}
                            onClick={() => canManageShifts ? openEdit(a) : undefined}
                            className="w-full text-left rounded-md px-2 py-1.5 text-xs border border-border/40 hover:bg-background/70"
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: dep?.color_code ?? "#3b82f6",
                            }}
                          >
                            <div className="font-medium truncate">
                              {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {tmpl?.shift_code ?? ""} · {format(parseISO(a.actual_start_timestamp), "HH:mm")}–{format(parseISO(a.actual_end_timestamp), "HH:mm")}
                            </div>
                            {dep && (
                              <div className="text-[10px] text-muted-foreground truncate">{dep.department_name}</div>
                            )}
                          </button>
                        );
                      })}
                      {dayAssignments.length === 0 && (
                        <p className="text-[10px] text-muted-foreground px-1 py-2">{t("shifts.noneScheduled")}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Mobile: vertical list (mobile-optimized: 44px+ touch targets) */}
            <div className="flex flex-col gap-4 md:hidden pb-4">
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const dayAssignments = assignmentsByDay.get(key) ?? [];
                const isToday = isSameDay(d, new Date());
                const dayLeaves = leavesInWeek.filter(
                  (l: any) => d >= maxDate([parseISO(l.start_date), weekStart]) && d <= minDate([parseISO(l.end_date), weekEnd]),
                );
                return (
                  <div
                    key={key}
                    className={`rounded-xl border border-border/40 bg-background/40 flex flex-col ${
                      isToday ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-muted-foreground font-medium">{format(d, "EEE")}</span>
                        <span className="text-base font-semibold">{format(d, "d MMM")}</span>
                      </div>
                      {canManageShifts && (
                        <button
                          onClick={() => openNew(d)}
                          className="flex items-center justify-center min-h-11 min-w-11 rounded-full bg-primary/10 text-primary active:bg-primary/20 transition-colors"
                          aria-label="Add shift"
                        >
                          <Plus className="size-5" />
                        </button>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      {dayLeaves.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {dayLeaves.map((l: any) => {
                            const emp = (employees.data ?? []).find((e: any) => e.id === l.employee_id);
                            const empName = emp ? `${emp.first_name} ${emp.last_name}` : "—";
                            return (
                              <div
                                key={l.id}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium active:opacity-80 transition-opacity"
                                style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "#fff" }}
                                onClick={() => setLeaveDialog({
                                  id: l.id,
                                  employee_id: l.employee_id,
                                  start_date: l.start_date,
                                  end_date: l.end_date,
                                  leave_type: l.leave_type,
                                  reason: l.reason ?? "",
                                })}
                              >
                                <Umbrella className="size-5 shrink-0" />
                                <span className="font-medium">{empName}</span>
                                <span className="opacity-70 text-xs ml-auto">{l.leave_type}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {dayAssignments.map((a) => {
                        const dep = a.departments as { department_name: string; color_code: string } | null;
                        const emp = a.employees as { first_name: string; last_name: string; primary_role: string } | null;
                        const tmpl = a.shift_templates as { shift_code: string } | null;
                        return (
                          <button
                            key={a.id}
                            onClick={() => canManageShifts ? openEdit(a) : undefined}
                            className="w-full text-left rounded-xl px-4 py-3 text-sm border border-border/40 hover:bg-background/70 flex items-center gap-3 min-h-[44px]"
                            style={{ borderLeftWidth: 4, borderLeftColor: dep?.color_code ?? "#3b82f6" }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">
                                {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {tmpl?.shift_code ?? ""} · {format(parseISO(a.actual_start_timestamp), "HH:mm")}–{format(parseISO(a.actual_end_timestamp), "HH:mm")}
                              </div>
                            </div>
                            {dep && (
                              <div className="text-xs text-muted-foreground shrink-0 font-medium">{dep.department_name}</div>
                            )}
                          </button>
                        );
                      })}
                      {dayAssignments.length === 0 && dayLeaves.length === 0 && (
                        <p className="text-sm text-muted-foreground px-1 py-3">{t("shifts.noneScheduled")}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <MonthView
            anchor={anchor}
            assignmentsByDay={assignmentsByDay}
            leavesByDay={leavesByDay}
            employees={employees.data ?? []}
            onOpenNew={openNew}
            onOpenEdit={openEdit}
            canManageAll={canManageShifts}
          />
        )}
      </GlassPanel>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialog?.id ? t("roster.editAssignment") : t("roster.newAssignment")}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("roster.employee")}</Label>
                  <Select
                    value={dialog.employee_id}
                    onValueChange={(v) => setDialog({ ...dialog, employee_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(employees.data ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.first_name} {e.last_name} · {e.primary_role.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("roster.department")}</Label>
                  <Select
                    value={dialog.department_id}
                    onValueChange={(v) => setDialog({ ...dialog, department_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(departments.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("roster.template")}</Label>
                  <Select
                    value={dialog.shift_template_id ?? "__none"}
                    onValueChange={(v) =>
                      setDialog({ ...dialog, shift_template_id: v === "__none" ? null : v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {(templates.data ?? []).map((tmpl) => (
                        <SelectItem key={tmpl.id} value={tmpl.id}>
                          {tmpl.shift_code} ({tmpl.start_time?.slice(0, 5)}–{tmpl.end_time?.slice(0, 5)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("roster.coverage")}</Label>
                  <Select
                    value={dialog.coverage_type}
                    onValueChange={(v) => setDialog({ ...dialog, coverage_type: v as CoverageType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular_Shift">Regular</SelectItem>
                      <SelectItem value="On_Call_Active">On-call active</SelectItem>
                      <SelectItem value="On_Call_Passive">On-call passive</SelectItem>
                      <SelectItem value="Mandatory_Overtime">Mandatory OT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("roster.start")}</Label>
                  <Input autoComplete="off"
                    type="datetime-local"
                    value={dialog.start}
                    onChange={(e) => setDialog({ ...dialog, start: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("roster.end")}</Label>
                  <Input autoComplete="off"
                    type="datetime-local"
                    value={dialog.end}
                    onChange={(e) => setDialog({ ...dialog, end: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("roster.notes")}</Label>
                <Input autoComplete="off"
                  value={dialog.notes}
                  onChange={(e) => setDialog({ ...dialog, notes: e.target.value })}
                />
              </div>

              {report && <ComplianceReportView report={report} />}

              {candidates && (
                <div className="space-y-1">
                  <div className="text-xs uppercase text-muted-foreground">
                    {t("roster.findReplacement")}
                  </div>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-sm">
                    {candidates.map((c) => (
                      <li
                        key={c.employee_id}
                        className="flex items-center justify-between rounded border border-border/40 px-2 py-1"
                      >
                        <span>
                          {c.first_name} {c.last_name}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            OT {c.overtime_score}m
                          </span>
                        </span>
                        {c.ok ? (
                          <Badge variant="secondary">OK</Badge>
                        ) : (
                          <Badge variant="destructive">{c.hard_violation_codes.length}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <DialogFooter className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2 flex-wrap">
                  {dialog.id && canManageShifts && (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="min-h-11 md:min-h-9"
                        onClick={() => dialog.id && deleteMut.mutate(dialog.id)}
                      >
                        <Trash2 className="size-4 mr-1" /> {t("roster.delete")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 md:min-h-9"
                        onClick={() => dialog.id && findMut.mutate(dialog.id)}
                        disabled={findMut.isPending}
                      >
                        <UserSearch className="size-4 mr-1" />
                        {t("roster.findReplacement")}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 md:min-h-9"
                    onClick={() => evalMut.mutate(dialog)}
                    disabled={!dialog.employee_id || evalMut.isPending}
                  >
                    Check
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="min-h-11 md:min-h-9" onClick={() => setDialog(null)}>
                    {t("common.cancel")}
                  </Button>
                  {canManageShifts && (
                    <Button type="submit" className="min-h-11 md:min-h-9" disabled={upsertMut.isPending}>
                      {t("common.save")}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!leaveDialog} onOpenChange={(o) => !o && setLeaveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave</DialogTitle>
          </DialogHeader>
          {leaveDialog && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canManageAll || permissions.leaves_manage || permissions.leaves_manage_department) leaveMut.mutate(leaveDialog);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>{t("roster.employee")}</Label>
                <Select
                  value={leaveDialog.employee_id}
                  onValueChange={(v) => setLeaveDialog({ ...leaveDialog, employee_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {(employees.data ?? []).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input autoComplete="off"
                    type="date"
                    value={leaveDialog.start_date}
                    onChange={(e) =>
                      setLeaveDialog({ ...leaveDialog, start_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input autoComplete="off"
                    type="date"
                    value={leaveDialog.end_date}
                    onChange={(e) =>
                      setLeaveDialog({ ...leaveDialog, end_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={leaveDialog.leave_type}
                  onValueChange={(v) => setLeaveDialog({ ...leaveDialog, leave_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Sick">Sick</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input autoComplete="off"
                  value={leaveDialog.reason}
                  onChange={(e) => setLeaveDialog({ ...leaveDialog, reason: e.target.value })}
                />
              </div>
              <DialogFooter className="flex justify-between gap-2">
                <div className="flex gap-2">
                  {leaveDialog.id && (canManageAll || permissions.leaves_manage || permissions.leaves_manage_department) && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="min-h-11 md:min-h-9"
                      onClick={() => {
                        if (!activeTenantId) return;
                        deleteLeave({ data: { id: leaveDialog.id!, tenant_id: activeTenantId } })
                          .then(() => {
                            toast.success("Leave deleted");
                            setLeaveDialog(null);
                            qc.invalidateQueries({ queryKey: ["leaves", activeTenantId] });
                          })
                          .catch((err) => toast.error((err as Error).message));
                      }}
                    >
                      <Trash2 className="size-4 mr-1" /> {t("roster.delete")}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="min-h-11 md:min-h-9" onClick={() => setLeaveDialog(null)}>
                    {t("common.cancel")}
                  </Button>
                  {(canManageAll || permissions.leaves_manage || permissions.leaves_manage_department) && (
                    <Button type="submit" className="min-h-11 md:min-h-9" disabled={leaveMut.isPending || !leaveDialog.employee_id}>
                      {t("common.save")}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ComplianceReportView = ({ report }: { report: ComplianceReport }) => (
  <div className="space-y-2 rounded-md border border-border/40 p-3 bg-background/40">
    <div className="flex items-center gap-2">
      {report.ok ? (
        <Badge variant="secondary">✓ Compliant</Badge>
      ) : (
        <Badge variant="destructive">✗ {report.hardViolations.length} blocking</Badge>
      )}
      {report.softViolations.length > 0 && (
        <Badge variant="outline">{report.softViolations.length} warnings</Badge>
      )}
    </div>
    {report.hardViolations.length > 0 && (
      <ul className="text-xs text-destructive space-y-0.5">
        {report.hardViolations.map((v, i) => (
          <li key={i}>• {v.message}</li>
        ))}
      </ul>
    )}
    {report.softViolations.length > 0 && (
      <ul className="text-xs text-muted-foreground space-y-0.5">
        {report.softViolations.map((v, i) => (
          <li key={i}>• {v.message}</li>
        ))}
      </ul>
    )}
  </div>
);
