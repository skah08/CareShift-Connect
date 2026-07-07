import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Check, X } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { createTenant, listAllTenants, deleteTenant } from "@/lib/tenants.functions";

export const TenantAdminPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setActiveTenantId } = useTenant();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ["allTenants"],
    queryFn: () => listAllTenants(),
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await createTenant({ data: { name: formName, slug: formSlug } });
      return res;
    },
    onSuccess: (res) => {
      toast.success(t("admin.tenant.created"));
      setShowCreate(false);
      setFormName("");
      setFormSlug("");
      qc.invalidateQueries({ queryKey: ["allTenants"] });
      setActiveTenantId(res.tenant_id);
      navigate({ to: "/dashboard" });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (tenantId: string) => {
      await deleteTenant({ data: { tenant_id: tenantId } });
    },
    onSuccess: () => {
      toast.success(t("admin.tenant.deleted"));
      setDeleteTarget(null);
      setConfirmName("");
      setConfirmDelete("");
      qc.invalidateQueries({ queryKey: ["allTenants"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const slugify = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const canDelete =
    confirmName === deleteTarget?.name && confirmDelete === "DELETE";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("admin.tenant.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.tenant.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(true);
            setFormName("");
            setFormSlug("");
          }}
          className="min-h-11 md:min-h-9"
        >
          <Plus className="size-4 mr-1.5" />
          {t("admin.tenant.new")}
        </Button>
      </div>

      <GlassPanel className="p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-destructive">
            Error: {(error as Error).message}
          </p>
        ) : !tenants?.length ? (
          <p className="text-sm text-muted-foreground">{t("admin.tenant.empty")}</p>
        ) : (
          <div className="divide-y divide-border/50">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{tenant.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tenant.slug} · {t("admin.tenant.memberCount", { count: tenant.member_count })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="min-h-9"
                    onClick={() => {
                      setDeleteTarget({ id: tenant.id, name: tenant.name });
                      setConfirmName("");
                      setConfirmDelete("");
                    }}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    {t("admin.tenant.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.tenant.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formName.trim() || !formSlug.trim()) return;
              createMut.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t("admin.tenant.orgName")}</Label>
              <Input
                autoComplete="off"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.tenant.slug")}</Label>
              <Input
                autoComplete="off"
                value={formSlug}
                onChange={(e) => setFormSlug(slugify(e.target.value))}
                pattern="^[a-z0-9-]+$"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                {t("admin.tenant.slugHint")}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="min-h-11 sm:min-h-9">
                {t("admin.tenant.cancel")}
              </Button>
              <Button type="submit" disabled={!formName.trim() || !formSlug.trim() || createMut.isPending} className="min-h-11 sm:min-h-9">
                {createMut.isPending ? t("common.loading") : t("admin.tenant.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setConfirmName("");
            setConfirmDelete("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              {t("admin.tenant.deleteTitle")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              <Trans i18nKey="admin.tenant.deleteWarning" values={{ name: deleteTarget?.name }} />
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1">
              <p className="font-medium text-destructive">{t("admin.tenant.deleteWhat")}</p>
              <ul className="text-muted-foreground text-xs space-y-0.5 list-disc list-inside">
                <li>{t("admin.tenant.deleteItem1")}</li>
                <li>{t("admin.tenant.deleteItem2")}</li>
                <li>{t("admin.tenant.deleteItem3")}</li>
                <li>{t("admin.tenant.deleteItem4")}</li>
                <li>{t("admin.tenant.deleteItem5")}</li>
                <li>{t("admin.tenant.deleteItem6")}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                <Trans i18nKey="admin.tenant.confirmName" values={{ name: deleteTarget?.name }} />
              </Label>
              <Input
                autoComplete="off"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={deleteTarget?.name}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                <Trans i18nKey="admin.tenant.confirmDelete" />
              </Label>
              <Input
                autoComplete="off"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 items-center">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteTarget(null);
                setConfirmName("");
                setConfirmDelete("");
              }}
              className="min-h-11 sm:min-h-9"
            >
              <X className="size-4 mr-1" />
              {t("admin.tenant.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="min-h-11 sm:min-h-9"
            >
              <Check className="size-4 mr-1" />
              {deleteMut.isPending ? t("common.loading") : t("admin.tenant.permanentlyDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
