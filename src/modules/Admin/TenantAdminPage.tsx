import { useState } from "react";
import { useTranslation } from "react-i18next";
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
      toast.success("Tenant created");
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
      toast.success("Tenant deleted");
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Tenant Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage organisations
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
          New tenant
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
          <p className="text-sm text-muted-foreground">No tenants found</p>
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
                      {tenant.slug} · {tenant.member_count} member{tenant.member_count !== 1 ? "s" : ""}
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
                    Delete
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
            <DialogTitle>New tenant</DialogTitle>
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
              <Label>Organisation name</Label>
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
              <Label>Slug</Label>
              <Input
                autoComplete="off"
                value={formSlug}
                onChange={(e) => setFormSlug(slugify(e.target.value))}
                pattern="^[a-z0-9-]+$"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Lowercase letters, digits and hyphens only
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formName.trim() || !formSlug.trim() || createMut.isPending}>
                {createMut.isPending ? t("common.loading") : "Create"}
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
              Delete tenant
            </DialogTitle>
            <DialogDescription className="pt-2">
              This action <strong>cannot be undone</strong>. All data associated with{" "}
              <strong>{deleteTarget?.name}</strong> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1">
              <p className="font-medium text-destructive">What will be deleted:</p>
              <ul className="text-muted-foreground text-xs space-y-0.5 list-disc list-inside">
                <li>All shift assignments and roster data</li>
                <li>All employees and their profiles</li>
                <li>All departments, shift templates, and skills</li>
                <li>All leave records and swap requests</li>
                <li>All compliance and configuration settings</li>
                <li>All tenant memberships and permissions</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                Type <strong>{deleteTarget?.name}</strong> to confirm:
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
                Type <strong>DELETE</strong> to confirm:
              </Label>
              <Input
                autoComplete="off"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteTarget(null);
                setConfirmName("");
                setConfirmDelete("");
              }}
            >
              <X className="size-4 mr-1" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              <Check className="size-4 mr-1" />
              {deleteMut.isPending ? t("common.loading") : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
