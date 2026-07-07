import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassPanel } from "@/components/GlassPanel";
import { createTenant } from "@/lib/tenants.functions";
import { useTenant } from "@/hooks/useTenant";

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

export const OnboardingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { memberships, setActiveTenantId, refresh } = useTenant();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { tenant_id } = await createTenant({
        data: { name: name.trim(), slug: slug.trim() || slugify(name) },
      });
      await refresh();
      setActiveTenantId(tenant_id);
      toast.success(t("onboarding.created"));
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassPanel className="w-full max-w-lg p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("onboarding.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("onboarding.orgName")}</Label>
            <Input autoComplete="off"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug((prev) => (prev ? prev : slugify(e.target.value)));
              }}
              placeholder={t("onboarding.orgNamePlaceholder")}
              required
              minLength={2}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("onboarding.slug")}</Label>
            <Input autoComplete="off"
              id="slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder={t("onboarding.slugPlaceholder")}
              pattern="[a-z0-9-]+"
              required
              minLength={2}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {t("onboarding.slugHint")}
            </p>
          </div>
          <Button type="submit" disabled={submitting} className="w-full min-h-11 sm:min-h-9">
            {submitting ? t("onboarding.submitting") : t("onboarding.submit")}
          </Button>
        </form>

        {memberships.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-muted-foreground mb-2">
              {t("onboarding.switchOrg")}
            </p>
            <div className="space-y-2">
              {memberships.map((m) => (
                <button
                  key={m.tenant_id}
                  type="button"
                  onClick={() => {
                    setActiveTenantId(m.tenant_id);
                    navigate({ to: "/dashboard" });
                  }}
                  className="w-full text-left px-3 py-2 rounded-md border border-white/10 hover:bg-white/5 transition min-h-11"
                >
                  <div className="font-medium">{m.tenant_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.tenant_slug} · {m.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default OnboardingPage;
