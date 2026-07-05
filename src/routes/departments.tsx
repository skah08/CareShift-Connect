import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DepartmentsPage } from "@/modules/Departments/DepartmentsPage";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — Hospishift" },
      { name: "description", content: "Manage hospital departments and cost centres." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <DepartmentsPage />
      </AppShell>
    </ProtectedRoute>
  ),
});