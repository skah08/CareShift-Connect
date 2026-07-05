import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StaffPage } from "@/modules/Staff/StaffPage";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff \u2014 Hospishift" },
      { name: "description", content: "Hospital personnel directory." },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AppShell>
        <StaffPage />
      </AppShell>
    </ProtectedRoute>
  ),
});