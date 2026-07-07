import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionsPage } from "@/modules/Permissions/PermissionsPage";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Permissions — HospiShift" },
      { name: "description", content: "Manage user permissions." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <PermissionsPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
