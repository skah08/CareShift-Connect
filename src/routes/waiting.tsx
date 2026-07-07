import { createFileRoute } from "@tanstack/react-router";

import { WaitingApprovalPage } from "@/modules/WaitingApproval/WaitingApprovalPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/waiting")({
  head: () => ({
    meta: [
      { title: "Awaiting Approval \u2014 HospiShift" },
      { name: "description", content: "Your account is awaiting administrator approval." },
    ],
  }),
  component: () => (
    <ProtectedRoute requireWaiting>
      <WaitingApprovalPage />
    </ProtectedRoute>
  ),
});
