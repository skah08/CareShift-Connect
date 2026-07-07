import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Moon } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTenant } from "@/hooks/useTenant";
import {
  listShiftTemplates,
  upsertShiftTemplate,
  deleteShiftTemplate,
} from "@/lib/shiftTemplates.functions";

interface FormState {
  id?: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
  allocated_break_minutes: number;
}

const emptyForm = (): FormState => ({
  shift_code: "",
  start_time: "",
  end_time: "",
  is_night_shift: false,
  allocated_break_minutes: 30,
});

export const ShiftTemplatesPage = () => {
  const { t } = useTranslation();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["shiftTemplates", activeTenantId],
    queryFn: () => listShiftTemplates({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      await upsertShiftTemplate({
        data: { ...form, tenant_id: activeTenantId! },
      });
    },
    onSuccess: () => {
      toast.success(form.id ? t("templates.updated") : t("templates.created"));
      setDialogOpen(false);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ["shiftTemplates", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await deleteShiftTemplate({ data: { id, tenant_id: activeTenantId! } });
    },
    onSuccess: () => {
      toast.success(t("templates.deleted"));
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["shiftTemplates", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const openEdit = (tmpl: (typeof templates)[number]) => {
    setForm({
      id: tmpl.id,
      shift_code: tmpl.shift_code,
      start_time: tmpl.start_time.slice(0, 5),
      end_time: tmpl.end_time.slice(0, 5),
      is_night_shift: tmpl.is_night_shift,
      allocated_break_minutes: tmpl.allocated_break_minutes,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("templates.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("templates.subtitle")}</p>
        </div>
        <Button onClick={openCreate} className="min-h-11 sm:min-h-9">
          <Plus className="size-4 mr-1.5" />
          {t("templates.new")}
        </Button>
      </div>

      <GlassPanel className="p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("templates.empty")}</p>
        ) : (
          <div className="divide-y divide-border/50">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                    <span className="text-xs font-bold">{tmpl.shift_code.slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {tmpl.shift_code} · {t(`templates.codes.${tmpl.shift_code}`, tmpl.shift_code)}
                      {tmpl.is_night_shift && <Moon className="size-3 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tmpl.start_time.slice(0, 5)}–{tmpl.end_time.slice(0, 5)}
                      {tmpl.allocated_break_minutes > 0 && (
                        <span className="ml-2">· {tmpl.allocated_break_minutes}{t("templates.minBreak")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {tmpl.is_night_shift ? t("templates.night") : t("templates.day")}
                  </Badge>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(tmpl)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setDeleteTarget(tmpl.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("templates.edit") : t("templates.new")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.shift_code.trim() || !form.start_time || !form.end_time) return;
              saveMut.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t("templates.shiftCode")}</Label>
              <Input
                autoComplete="off"
                value={form.shift_code}
                onChange={(e) => setForm({ ...form, shift_code: e.target.value })}
                placeholder={t("templates.shiftCodePlaceholder")}
                maxLength={10}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("templates.startTime")}</Label>
                <Input
                  type="time"
                  autoComplete="off"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("templates.endTime")}</Label>
                <Input
                  type="time"
                  autoComplete="off"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("templates.breakMinutes")}</Label>
              <Input
                type="number"
                min={0}
                max={240}
                step={5}
                autoComplete="off"
                value={form.allocated_break_minutes}
                onChange={(e) => setForm({ ...form, allocated_break_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("templates.isNight")}</Label>
              <Switch
                checked={form.is_night_shift}
                onCheckedChange={(v) => setForm({ ...form, is_night_shift: v })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!form.shift_code.trim() || !form.start_time || !form.end_time || saveMut.isPending}
              >
                {saveMut.isPending ? t("common.loading") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("templates.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? t("common.loading") : t("templates.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
