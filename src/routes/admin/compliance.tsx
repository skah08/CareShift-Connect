import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComplianceConfigPage } from "@/modules/Admin/ComplianceConfigPage";

export const Route = createFileRoute("/admin/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance Rules — HospiShift" },
      { name: "description", content: "Configure work-hour and scheduling rules." },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AppShell>
        <ComplianceConfigPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
