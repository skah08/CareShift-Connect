import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CalendarPage } from "@/modules/Calendar/CalendarPage";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar \u2014 HospiShift" },
      { name: "description", content: "Weekly and monthly shift calendar." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <CalendarPage />
      </AppShell>
    </ProtectedRoute>
  ),
});