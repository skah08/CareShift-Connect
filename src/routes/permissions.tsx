import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionsPage } from "@/modules/Permissions/PermissionsPage";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Permessi — Hospishift" },
      { name: "description", content: "Gestione permessi utente." },
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
