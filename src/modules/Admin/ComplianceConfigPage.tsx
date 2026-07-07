import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/hooks/useTenant";
import { getTenantConfig, updateTenantConfig } from "@/lib/tenants.functions";
import { listShiftTemplates } from "@/lib/shiftTemplates.functions";

export const ComplianceConfigPage = () => {
  const { t } = useTranslation();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();

  const [minRest, setMinRest] = useState(11);
  const [maxWeekly, setMaxWeekly] = useState(48);
  const [nightStart, setNightStart] = useState("22:00");
  const [nightEnd, setNightEnd] = useState("06:00");
  const [autoApproval, setAutoApproval] = useState(false);
  const [sequences, setSequences] = useState<{ from: string; to: string }[]>([]);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["tenantConfig", activeTenantId],
    queryFn: () => getTenantConfig({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["shiftTemplates", activeTenantId],
    queryFn: () => listShiftTemplates({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  useEffect(() => {
    if (!config) return;
    setMinRest(Number(config.min_daily_rest_hrs ?? 11));
    setMaxWeekly(Number(config.max_weekly_work_hrs ?? 48));
    const window = (config.night_shift_window ?? {}) as { start: string; end: string };
    setNightStart(window.start ?? "22:00");
    setNightEnd(window.end ?? "06:00");
    setAutoApproval(!!config.auto_approval_peer_swap);
    const matrix = (config.forbidden_sequence_matrix ?? {}) as Record<string, string[]>;
    const entries: { from: string; to: string }[] = [];
    for (const [from, toList] of Object.entries(matrix)) {
      for (const to of toList) {
        entries.push({ from, to });
      }
    }
    setSequences(entries);
  }, [config]);

  const allCodes = templates.map((t) => t.shift_code);
  const codeLabel = (code: string) => {
    const tmpl = templates.find((t) => t.shift_code === code);
    if (!tmpl) return code;
    return `${tmpl.shift_code} · ${t(`templates.codes.${code}`, code)} (${tmpl.start_time.slice(0, 5)}–${tmpl.end_time.slice(0, 5)})`;
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const matrix: Record<string, string[]> = {};
      for (const s of sequences) {
        if (!s.from || !s.to) continue;
        if (!matrix[s.from]) matrix[s.from] = [];
        if (!matrix[s.from].includes(s.to)) matrix[s.from].push(s.to);
      }
      await updateTenantConfig({
        data: {
          tenant_id: activeTenantId!,
          min_daily_rest_hrs: minRest,
          max_weekly_work_hrs: maxWeekly,
          night_shift_window: { start: nightStart, end: nightEnd },
          auto_approval_peer_swap: autoApproval,
          forbidden_sequence_matrix: matrix,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("compliance.saved"));
      qc.invalidateQueries({ queryKey: ["tenantConfig", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const addSequence = () => {
    setSequences([...sequences, { from: "", to: "" }]);
  };

  const updateSequence = (index: number, field: "from" | "to", value: string) => {
    const copy = sequences.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setSequences(copy);
  };

  const removeSequence = (index: number) => {
    setSequences(sequences.filter((_, i) => i !== index));
  };

  if (configLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("compliance.title")}</h1>
        <GlassPanel className="p-6">
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </GlassPanel>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("compliance.title")}</h1>
        <GlassPanel className="p-6">
          <p className="text-sm text-muted-foreground">{t("compliance.notFound")}</p>
        </GlassPanel>
      </div>
    );
  }

  return (
      <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("compliance.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("compliance.subtitle")}</p>
      </div>

      <GlassPanel className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("compliance.minDailyRest")}</Label>
              <Input
                type="number"
                min={0}
                max={48}
                step={0.5}
                autoComplete="off"
                value={minRest}
                onChange={(e) => setMinRest(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("compliance.maxWeeklyWork")}</Label>
              <Input
                type="number"
                min={0}
                max={168}
                step={1}
                autoComplete="off"
                value={maxWeekly}
                onChange={(e) => setMaxWeekly(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("compliance.nightShiftWindow")}</Label>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                autoComplete="off"
                value={nightStart}
                onChange={(e) => setNightStart(e.target.value)}
                className="w-32"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="time"
                autoComplete="off"
                value={nightEnd}
                onChange={(e) => setNightEnd(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>{t("compliance.autoApproval")}</Label>
            <Switch checked={autoApproval} onCheckedChange={setAutoApproval} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("compliance.forbiddenSequence")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSequence}>
                <Plus className="size-3.5 mr-1" />
                {t("compliance.addSequence")}
              </Button>
            </div>
            {sequences.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("compliance.addSequence")}...</p>
            )}
            <div className="space-y-2">
              {sequences.map((seq, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border/40 bg-background/40">
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Select
                      value={seq.from}
                      onValueChange={(v) => updateSequence(i, "from", v)}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder={t("compliance.from")} />
                      </SelectTrigger>
                      <SelectContent>
                        {allCodes.map((code) => (
                          <SelectItem key={code} value={code}>
                            {codeLabel(code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground shrink-0">→</span>
                    <Select
                      value={seq.to}
                      onValueChange={(v) => updateSequence(i, "to", v)}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder={t("compliance.to")} />
                      </SelectTrigger>
                      <SelectContent>
                        {allCodes.map((code) => (
                          <SelectItem key={code} value={code}>
                            {codeLabel(code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 self-end sm:self-center"
                    onClick={() => removeSequence(i)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={saveMut.isPending} className="min-h-11 sm:min-h-9 flex-1">
              {saveMut.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
};
