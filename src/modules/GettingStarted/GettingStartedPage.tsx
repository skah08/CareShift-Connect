import { useTranslation } from "react-i18next";
import { GlassPanel } from "@/components/GlassPanel";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Building2,
  Umbrella,
  ArrowLeftRight,
  Shield,
  Building,
  Scale,
  Clock,
  Info,
} from "lucide-react";

const sections = [
  {
    key: "whatIs",
    icon: Info,
  },
  {
    key: "terms",
    icon: Info,
    subs: [
      { key: "fte" },
      { key: "costCenter" },
      { key: "shiftTemplate" },
      { key: "tenant" },
      { key: "compliance" },
      { key: "permissions" },
    ],
  },
  {
    key: "features",
    icon: LayoutDashboard,
    subs: [
      { key: "dashboard", icon: LayoutDashboard },
      { key: "calendar", icon: CalendarDays },
      { key: "staff", icon: Users },
      { key: "departments", icon: Building2 },
      { key: "leaves", icon: Umbrella },
      { key: "swaps", icon: ArrowLeftRight },
    ],
  },
  {
    key: "admin",
    icon: Shield,
    subs: [
      { key: "tenants", icon: Building },
      { key: "compliance", icon: Scale },
      { key: "templates", icon: Clock },
      { key: "permissions", icon: Shield },
      { key: "staff", icon: Users },
    ],
  },
];

export const GettingStartedPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("gettingStarted.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("gettingStarted.subtitle")}</p>
      </div>

      {sections.map((section) =>
        section.subs ? (
          <GlassPanel key={section.key} className="p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <section.icon className="size-5 text-primary" />
              {t(`gettingStarted.${section.key}.title`)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.subs.map((sub: any) => {
                const SubIcon = sub.icon ?? Info;
                return (
                  <div key={sub.key} className="space-y-1.5">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <SubIcon className="size-4 text-primary shrink-0" />
                      {t(`gettingStarted.${section.key}.${sub.key}.title`)}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {t(`gettingStarted.${section.key}.${sub.key}.body`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel key={section.key} className="p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <section.icon className="size-5 text-primary" />
              {t(`gettingStarted.${section.key}.title`)}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`gettingStarted.${section.key}.body`)}
            </p>
          </GlassPanel>
        )
      )}
    </div>
  );
};
