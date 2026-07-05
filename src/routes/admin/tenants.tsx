import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TenantAdminPage } from "@/modules/Admin/TenantAdminPage";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — Hospishift" },
      { name: "description", content: "Manage organisations." },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AppShell>
        <TenantAdminPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
