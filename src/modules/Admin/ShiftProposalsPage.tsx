import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, User, ShieldAlert } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTenant } from "@/hooks/useTenant";
import {
  listPendingShiftProposals,
  approveShiftProposal,
  rejectShiftProposal,
  type ShiftProposalDTO,
} from "@/lib/shift-proposals.functions";

export const ShiftProposalsPage = () => {
  const { t } = useTranslation();
  const { activeTenantId } = useTenant();
  const { permissions, superAdmin } = usePermissions();
  const canApprove = superAdmin || permissions.calendar_manage || permissions.calendar_manage_department;
  const qc = useQueryClient();

  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [rejectTarget, setRejectTarget] = useState<ShiftProposalDTO | null>(null);

  const { data: proposals, isLoading } = useQuery<ShiftProposalDTO[]>({
    queryKey: ["shiftProposals", activeTenantId],
    queryFn: () =>
      listPendingShiftProposals({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      await approveShiftProposal({ data: { assignment_id: id } });
    },
    onSuccess: () => {
      toast.success(t("admin.shiftProposals.approved"));
      qc.invalidateQueries({ queryKey: ["shiftProposals", activeTenantId] });
      qc.invalidateQueries({ queryKey: ["cal", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      await rejectShiftProposal({ data: { assignment_id: id } });
    },
    onSuccess: () => {
      toast.success(t("admin.shiftProposals.rejected"));
      setRejectTarget(null);
      qc.invalidateQueries({ queryKey: ["shiftProposals", activeTenantId] });
      qc.invalidateQueries({ queryKey: ["cal", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const departments = useMemo(() => {
    if (!proposals) return [];
    const seen = new Set<string>();
    return proposals.reduce(
      (acc, p) => {
        if (!seen.has(p.department_id)) {
          seen.add(p.department_id);
          acc.push({ id: p.department_id, name: p.department_name });
        }
        return acc;
      },
      [] as { id: string; name: string }[],
    );
  }, [proposals]);

  const filtered = useMemo(() => {
    if (!proposals) return [];
    if (selectedDeptId === "all") return proposals;
    return proposals.filter((p) => p.department_id === selectedDeptId);
  }, [proposals, selectedDeptId]);

  const pendingCount = filtered.length;

  if (!canApprove) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">{t("common.accessDenied")}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {t("admin.shiftProposals.noPermission")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("admin.shiftProposals.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.shiftProposals.subtitle")}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {pendingCount} {t("admin.shiftProposals.pending")}
          </Badge>
        )}
      </div>

      {departments.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("calendar.filterDepartment")}
          </span>
          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shiftProposals.allDepartments")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <GlassPanel className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {t("common.loading")}
            </span>
          </div>
        ) : !proposals || proposals.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("admin.shiftProposals.empty")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("admin.shiftProposals.emptyFilter")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.shiftProposals.employee")}
                  </th>
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.shiftProposals.department")}
                  </th>
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.shiftProposals.shift")}
                  </th>
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.shiftProposals.date")}
                  </th>
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4 hidden sm:table-cell">
                    {t("admin.shiftProposals.time")}
                  </th>
                  <th className="text-right font-medium text-muted-foreground pb-3">
                    {t("admin.shiftProposals.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/20 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{p.employee_name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {p.department_name}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">
                        {p.shift_code ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(p.shift_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                      {new Date(p.actual_start_timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      –
                      {new Date(p.actual_end_timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectTarget(p)}
                          disabled={rejectMut.isPending}
                          className="min-h-9"
                        >
                          <XCircle className="size-3.5 mr-1" />
                          {t("admin.shiftProposals.reject")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveMut.mutate(p.id)}
                          disabled={approveMut.isPending}
                          className="min-h-9"
                        >
                          <CheckCircle className="size-3.5 mr-1" />
                          {t("admin.shiftProposals.approve")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.shiftProposals.rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.shiftProposals.rejectDescription")}
            </DialogDescription>
          </DialogHeader>
          {rejectTarget && (
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
              {rejectTarget.employee_name} · {rejectTarget.department_name} ·{" "}
              {rejectTarget.shift_code ?? "—"} ·{" "}
              {new Date(rejectTarget.shift_date).toLocaleDateString()}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectTarget && rejectMut.mutate(rejectTarget.id)
              }
              disabled={rejectMut.isPending}
            >
              {rejectMut.isPending
                ? t("common.loading")
                : t("admin.shiftProposals.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftProposalsPage;
