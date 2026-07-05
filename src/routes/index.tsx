import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useAuth } from "@/hooks/useAuth";
import { AppLoader } from "@/components/AppLoader";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <AppLoader />;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />;
}
