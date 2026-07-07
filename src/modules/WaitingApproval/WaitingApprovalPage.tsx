import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { createTenantJoinRequest } from "@/lib/pending-approvals.functions";

export const WaitingApprovalPage = () => {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createTenantJoinRequest()
      .then(() => {
        if (!cancelled) setSubmitted(true);
      })
      .catch((err) => console.error("[Waiting] Failed to create request", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <GlassPanel variant="strong" className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 size-20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-full text-primary animate-pulse"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold">{t("waiting.title")}</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm">{t("waiting.description")}</p>

          <div className="mt-6 w-full max-w-xs space-y-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-4 shrink-0 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse" />
            {t(submitted ? "waiting.pendingBadge" : "common.loading")}
          </div>

          <div className="mt-6 w-full">
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default WaitingApprovalPage;
