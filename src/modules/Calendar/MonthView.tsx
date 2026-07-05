import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Plus, Umbrella } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthViewProps {
  anchor: Date;
  assignmentsByDay: Map<string, AssignmentRow[]>;
  leavesByDay: Map<string, any[]>;
  employees: Array<{ id: string; first_name: string; last_name: string }>;
  onOpenNew: (day: Date) => void;
  onOpenEdit: (a: AssignmentRow) => void;
  canManageAll: boolean;
}

type AssignmentRow = Awaited<ReturnType<typeof import("@/lib/roster.functions").listRosterRange>>[number];

export const MonthView = ({ anchor, assignmentsByDay, leavesByDay, employees, onOpenNew, onOpenEdit, canManageAll }: MonthViewProps) => {
  const { t } = useTranslation();

  const days = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [anchor]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const today = new Date();

  // On mobile: show as expandable day cards instead of tiny grid
  return (
    <div className="rounded-lg border border-border/40 bg-background/40">
      {/* Desktop: compact month grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 text-center text-[10px] uppercase text-muted-foreground py-2 border-b border-border/40">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-1">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/40 last:border-b-0">
            {week.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const dayAssignments = assignmentsByDay.get(key) ?? [];
              const dayLeaves = leavesByDay.get(key) ?? [];
              const isToday = isSameDay(d, today);
              const isCurrentMonth = isSameMonth(d, anchor);
              const total = dayAssignments.length + dayLeaves.length;
              return (
                <div
                  key={key}
                  className={`min-h-20 p-1 border-r border-border/40 last:border-r-0 flex flex-col gap-0.5 ${
                    isToday ? "bg-primary/5" : ""
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold leading-none px-1.5 py-1 rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {format(d, "d")}
                    </span>
                    {canManageAll && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={() => onOpenNew(d)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-y-auto">
                    {dayLeaves.slice(0, 1).map((l: any) => {
                      const emp = employees.find((e) => e.id === l.employee_id);
                      return (
                        <div
                          key={l.id}
                          className="rounded px-1 py-0.5 text-[10px] leading-tight truncate font-medium text-white"
                          style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                        >
                          🏖 {emp ? `${emp.first_name?.slice(0, 1)}. ${emp.last_name}` : "—"}
                        </div>
                      );
                    })}
                    {dayAssignments.slice(0, 3 - dayLeaves.length).map((a) => {
                      const emp = a.employees as { first_name: string; last_name: string } | null;
                      const dep = a.departments as { color_code: string } | null;
                      return (
                        <button
                          key={a.id}
                          onClick={() => onOpenEdit(a)}
                          className="w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate border-l-2 hover:bg-background/70 border-border/40"
                          style={{ borderLeftColor: dep?.color_code ?? "#3b82f6" }}
                        >
                          {emp ? `${emp.first_name?.slice(0, 1)}. ${emp.last_name}` : "—"}
                        </button>
                      );
                    })}
                    {total > 3 && (
                      <div className="text-[9px] text-muted-foreground px-1">
                        +{total - 3} more
                      </div>
                    )}
                    {total === 0 && (
                      <div className="text-[9px] text-muted-foreground px-1">{t("calendar.noShifts")}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Mobile: simple day-by-day list */}
      <div className="md:hidden flex flex-col gap-2 p-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {format(anchor, "MMMM yyyy")}
        </p>
        {days.filter((d) => isSameMonth(d, anchor)).map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayAssignments = assignmentsByDay.get(key) ?? [];
          const dayLeaves = leavesByDay.get(key) ?? [];
          const isToday = isSameDay(d, today);
          if (dayAssignments.length === 0 && dayLeaves.length === 0 && !isToday) return null;
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
                  <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{format(d, "d MMM")}</span>
                </div>
                {canManageAll && (
                  <button
                    onClick={() => onOpenNew(d)}
                    className="flex items-center justify-center min-h-11 min-w-11 rounded-full bg-primary/10 text-primary active:bg-primary/20 transition-colors"
                    aria-label="Add shift"
                  >
                    <Plus className="size-5" />
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                {dayLeaves.slice(0, 2).map((l: any) => {
                  const emp = employees.find((e) => e.id === l.employee_id);
                  return (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"
                      style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "#fff" }}
                    >
                      <Umbrella className="size-5 shrink-0" />
                      <span>{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</span>
                    </div>
                  );
                })}
                {dayAssignments.slice(0, 5).map((a) => {
                  const emp = a.employees as { first_name: string; last_name: string } | null;
                  const dep = a.departments as { color_code: string; department_name: string } | null;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpenEdit(a)}
                      className="w-full text-left rounded-xl px-4 py-3 text-sm border border-border/40 flex items-center gap-3 min-h-[44px]"
                      style={{ borderLeftWidth: 4, borderLeftColor: dep?.color_code ?? "#3b82f6" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                        </div>
                      </div>
                      {dep && (
                        <div className="text-xs text-muted-foreground shrink-0">{dep.department_name}</div>
                      )}
                    </button>
                  );
                })}
                {dayAssignments.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{dayAssignments.length - 5} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
