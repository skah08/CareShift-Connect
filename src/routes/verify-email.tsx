import { createFileRoute, Navigate } from "@tanstack/react-router";

import { VerifyEmailPage } from "@/modules/Auth/VerifyEmailPage";
import { useAuth } from "@/hooks/useAuth";

interface VerifyEmailSearch {
  email?: string;
}

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify Email \u2014 HospiShift" },
      { name: "description", content: "Check your email to verify your account." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" />;
  return <VerifyEmailPage />;
}
