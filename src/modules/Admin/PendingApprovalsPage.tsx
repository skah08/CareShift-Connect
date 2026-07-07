import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck, UserX, Clock, Mail } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import {
  listPendingRequests,
  approvePendingRequest,
  declinePendingRequest,
  listTenantsForApproval,
  type PendingRequestDTO,
  type TenantOption,
} from "@/lib/pending-approvals.functions";

export const PendingApprovalsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [approveTarget, setApproveTarget] = useState<PendingRequestDTO | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("staff");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  const { data: requests, isLoading } = useQuery<PendingRequestDTO[]>({
    queryKey: ["pendingRequests"],
    queryFn: () => listPendingRequests(),
    enabled: !!user,
  });

  const { data: tenants } = useQuery<TenantOption[]>({
    queryKey: ["tenantsForApproval"],
    queryFn: () => listTenantsForApproval(),
    enabled: !!user,
  });

  const { data: departments } = useQuery<
    Array<{ id: string; name: string; cost_center_code: string | null }>
  >({
    queryKey: ["departmentsForApproval", selectedTenantId],
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>
      )("list_departments_for_approval", {
        p_tenant_id: selectedTenantId,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; cost_center_code: string | null }>;
    },
    enabled: !!selectedTenantId,
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!approveTarget || !selectedTenantId) return;
      await approvePendingRequest({
        data: {
          requestId: approveTarget.id,
          tenantId: selectedTenantId,
          role: selectedRole as "owner" | "manager" | "planner" | "staff" | "viewer",
          departmentId: selectedDepartmentId || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("admin.pendingApprovals.approved"));
      setApproveTarget(null);
      setSelectedTenantId("");
      setSelectedRole("staff");
      setSelectedDepartmentId("");
      qc.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });

  const declineMut = useMutation({
    mutationFn: async (requestId: string) => {
      await declinePendingRequest({ data: { requestId } });
    },
    onSuccess: () => {
      toast.success(t("admin.pendingApprovals.declined"));
      qc.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });

  const pendingCount = requests?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("admin.pendingApprovals.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.pendingApprovals.subtitle")}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {pendingCount} {t("admin.pendingApprovals.pending")}
          </Badge>
        )}
      </div>

      <GlassPanel className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <UserCheck className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">{t("admin.pendingApprovals.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.pendingApprovals.email")}
                  </th>
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.pendingApprovals.type")}
                  </th>
                  <th className="text-left font-medium text-muted-foreground pb-3 pr-4">
                    {t("admin.pendingApprovals.date")}
                  </th>
                  <th className="text-right font-medium text-muted-foreground pb-3">
                    {t("admin.pendingApprovals.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-border/20 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{req.email ?? req.user_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {req.request_type === "tenant_join"
                          ? t("admin.pendingApprovals.typeJoin")
                          : req.request_type}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => declineMut.mutate(req.id)}
                          disabled={declineMut.isPending}
                          className="min-h-9"
                        >
                          <UserX className="size-3.5 mr-1" />
                          {t("admin.pendingApprovals.decline")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setApproveTarget(req);
                            setSelectedTenantId(tenants?.[0]?.id ?? "");
                            setSelectedRole("staff");
                          }}
                          className="min-h-9"
                        >
                          <UserCheck className="size-3.5 mr-1" />
                          {t("admin.pendingApprovals.approve")}
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

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.pendingApprovals.approveTitle")}</DialogTitle>
            <DialogDescription>{t("admin.pendingApprovals.approveDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
              {approveTarget?.email ?? approveTarget?.user_id}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("admin.pendingApprovals.selectTenant")}
              </label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.pendingApprovals.selectTenant")} />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("admin.pendingApprovals.selectRole")}
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="planner">Planner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("admin.pendingApprovals.selectDepartment")}
              </label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.pendingApprovals.selectDepartment")} />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.cost_center_code ? ` (${d.cost_center_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending || !selectedTenantId}
            >
              {approveMut.isPending
                ? t("common.loading")
                : t("admin.pendingApprovals.confirmApprove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovalsPage;
