import { useTranslation } from "react-i18next";
import { GlassPanel } from "@/components/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

type Status = "implemented" | "partial" | "missing";

interface Feature {
  key: string;
  status: Status;
  section: string;
  implementable: boolean;
}

const features: Feature[] = [
  { key: "rest", status: "implemented", section: "compliance", implementable: true },
  { key: "weeklyLimit", status: "implemented", section: "compliance", implementable: true },
  { key: "onCall", status: "partial", section: "compliance", implementable: true },
  { key: "fairness", status: "missing", section: "compliance", implementable: true },
  { key: "rbac", status: "implemented", section: "enterprise", implementable: true },
  { key: "badge", status: "missing", section: "enterprise", implementable: true },
  { key: "payroll", status: "missing", section: "enterprise", implementable: true },
  { key: "skillMatrix", status: "partial", section: "planning", implementable: true },
  { key: "substitution", status: "partial", section: "planning", implementable: true },
  { key: "autoScheduling", status: "missing", section: "planning", implementable: true },
  { key: "dragDrop", status: "implemented", section: "ui", implementable: true },
  { key: "mobile", status: "partial", section: "ui", implementable: true },
  { key: "swapModule", status: "implemented", section: "ui", implementable: true },
  { key: "multiTenant", status: "implemented", section: "security", implementable: false },
  { key: "audit", status: "partial", section: "security", implementable: true },
  { key: "encryption", status: "implemented", section: "security", implementable: false },
];

const sectionKeys = ["compliance", "enterprise", "planning", "ui", "security"];

const statusIcon: Record<Status, typeof CheckCircle2> = {
  implemented: CheckCircle2,
  partial: AlertTriangle,
  missing: XCircle,
};

const statusColor: Record<Status, string> = {
  implemented: "text-emerald-500",
  partial: "text-amber-500",
  missing: "text-red-500",
};

const badgeVariant: Record<Status, "default" | "secondary" | "destructive"> = {
  implemented: "default",
  partial: "secondary",
  missing: "destructive",
};

export const RoadmapPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("roadmap.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("roadmap.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        {(["implemented", "partial", "missing"] as Status[]).map((s) => {
          const Icon = statusIcon[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <Icon className={`size-4 ${statusColor[s]}`} />
              <Badge variant={badgeVariant[s]}>{t(`roadmap.${s}`)}</Badge>
              <span className="text-muted-foreground">— {t(`roadmap.legend.${s}`)}</span>
            </div>
          );
        })}
      </div>

      {sectionKeys.map((sectionKey) => {
        const sectionFeatures = features.filter((f) => f.section === sectionKey);
        return (
          <GlassPanel key={sectionKey} className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t(`roadmap.sections.${sectionKey}`)}</h2>
            <div className="divide-y divide-border/50">
              {sectionFeatures.map((f) => {
                const Icon = statusIcon[f.status];
                return (
                  <div key={f.key} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className={`size-5 shrink-0 mt-0.5 ${statusColor[f.status]}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                          {t(`roadmap.features.${f.key}.title`)}
                          <Badge variant={badgeVariant[f.status]} className="text-[10px]">
                            {t(`roadmap.${f.status}`)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(`roadmap.features.${f.key}.note`)}</p>
                      </div>
                    </div>
                    {f.implementable && f.status === "missing" && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Info className="size-3" />
                        {t("roadmap.implementable")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        );
      })}
    </div>
  );
};
