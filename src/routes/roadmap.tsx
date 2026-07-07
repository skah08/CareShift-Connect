import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoadmapPage } from "@/modules/Roadmap/RoadmapPage";
import i18n from "@/i18n/config";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: i18n.t("roadmap.title") + " — HospiShift" },
      { name: "description", content: i18n.t("roadmap.subtitle") },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <RoadmapPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
