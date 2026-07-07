import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ShiftProposalsPage } from "@/modules/Admin/ShiftProposalsPage";

export const Route = createFileRoute("/admin/shift-proposals")({
  head: () => ({
    meta: [
      { title: "Shift Proposals — HospiShift" },
      { name: "description", content: "Review and approve shift proposals." },
    ],
  }),
  component: () => (
    <ProtectedRoute requireTenant>
      <AppShell>
        <ShiftProposalsPage />
      </AppShell>
    </ProtectedRoute>
  ),
});
