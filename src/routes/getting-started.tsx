import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GettingStartedPage } from "@/modules/GettingStarted/GettingStartedPage";
import i18n from "@/i18n/config";

export const Route = createFileRoute("/getting-started")({
  head: () => ({
    meta: [
      { title: i18n.t("gettingStarted.title") + " — HospiShift" },
      { name: "description", content: i18n.t("gettingStarted.subtitle") },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <GettingStartedPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
