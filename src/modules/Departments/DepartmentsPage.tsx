import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTenant } from "@/hooks/useTenant";
import { listDepartments, upsertDepartment } from "@/lib/departments.functions";

type DepartmentRow = Awaited<ReturnType<typeof listDepartments>>[number];

interface FormState {
  id?: string;
  department_name: string;
  cost_center_code: string;
  color_code: string;
}

const emptyForm: FormState = { department_name: "", cost_center_code: "", color_code: "#3b82f6" };

export const DepartmentsPage = () => {
  const { t } = useTranslation();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const query = useQuery({
    queryKey: ["departments", activeTenantId],
    queryFn: () => listDepartments({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const mutation = useMutation({
    mutationFn: async (payload: FormState) => {
      if (!activeTenantId) throw new Error("No active tenant");
      return upsertDepartment({
        data: {
          tenant_id: activeTenantId,
          id: payload.id,
          department_name: payload.department_name,
          cost_center_code: payload.cost_center_code || null,
          color_code: payload.color_code,
          min_staffing_requirements: {},
        },
      });
    },
    onSuccess: () => {
      toast.success(t("common.save"));
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["departments", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (d: DepartmentRow) => {
    setForm({
      id: d.id,
      department_name: d.department_name,
      cost_center_code: d.cost_center_code ?? "",
      color_code: d.color_code ?? "#3b82f6",
    });
    setOpen(true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("departments.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("departments.subtitle")}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-2" /> {t("departments.add")}
        </Button>
      </div>

      <GlassPanel className="p-6">
        {query.isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (query.data?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground">{t("departments.empty")}</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {query.data!.map((d) => (
              <li key={d.id} className="py-3 md:py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block size-4 rounded shrink-0"
                    style={{ backgroundColor: d.color_code ?? "#3b82f6" }}
                  />
                  <div>
                    <div className="font-medium">{d.department_name}</div>
                    {d.cost_center_code && (
                      <div className="text-xs text-muted-foreground">
                        {d.cost_center_code}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="min-h-11 min-w-11 md:min-h-8 md:min-w-8" onClick={() => openEdit(d)}>
                  <Pencil className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("departments.edit") : t("departments.add")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dname">{t("departments.name")}</Label>
              <Input autoComplete="off"
                id="dname"
                value={form.department_name}
                onChange={(e) => setForm({ ...form, department_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">{t("departments.cost")}</Label>
              <Input autoComplete="off"
                id="cost"
                value={form.cost_center_code}
                onChange={(e) => setForm({ ...form, cost_center_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">{t("departments.colour")}</Label>
              <Input autoComplete="off"
                id="color"
                type="color"
                value={form.color_code}
                onChange={(e) => setForm({ ...form, color_code: e.target.value })}
                className="h-10 w-24 p-1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="min-h-11 md:min-h-9">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="min-h-11 md:min-h-9">
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};