import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";

export const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { email } = useSearch({ from: "/verify-email" });

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <GlassPanel variant="strong" className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold">{t("verifyEmail.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("verifyEmail.description")}</p>
        {email && <p className="mt-3 text-sm font-medium text-foreground">{email}</p>}
        <Button className="mt-6 w-full" onClick={() => navigate({ to: "/login" })}>
          {t("verifyEmail.backToLogin")}
        </Button>
      </GlassPanel>
    </div>
  );
};
