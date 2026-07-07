import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TenantAdminPage } from "@/modules/Admin/TenantAdminPage";
import i18n from "@/i18n/config";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({
    meta: [
      { title: i18n.t("admin.tenant.title") + " — HospiShift" },
      { name: "description", content: i18n.t("admin.tenant.subtitle") },
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
