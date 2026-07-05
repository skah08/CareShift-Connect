import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardPage } from "@/modules/Dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard \u2014 Hospishift" },
      { name: "description", content: "Your Hospishift dashboard." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <DashboardPage />
      </AppShell>
    </ProtectedRoute>
  ),
});