import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ShiftTemplatesPage } from "@/modules/Admin/ShiftTemplatesPage";

export const Route = createFileRoute("/admin/templates")({
  head: () => ({
    meta: [
      { title: "Shift Templates — HospiShift" },
      { name: "description", content: "Manage shift templates." },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AppShell>
        <ShiftTemplatesPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
