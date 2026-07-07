import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PendingApprovalsPage } from "@/modules/Admin/PendingApprovalsPage";

export const Route = createFileRoute("/admin/pending-approvals")({
  head: () => ({
    meta: [
      { title: "Pending Approvals — HospiShift" },
      { name: "description", content: "Manage pending approval requests." },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AppShell>
        <PendingApprovalsPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
