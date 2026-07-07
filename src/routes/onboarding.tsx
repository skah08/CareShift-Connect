import { createFileRoute } from "@tanstack/react-router";

import { OnboardingPage } from "@/modules/Onboarding/OnboardingPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding \u2014 HospiShift" },
      { name: "description", content: "Create or join your organization." },
    ],
  }),
  component: () => (
    <ProtectedRoute requireTenant={false}>
      <OnboardingPage />
    </ProtectedRoute>
  ),
});