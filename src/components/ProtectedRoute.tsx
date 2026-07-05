import { Navigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AppLoader } from "./AppLoader";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import type { AppRole } from "@/interfaces";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  requireTenant?: boolean;
}

export const ProtectedRoute = ({ children, requiredRoles, requireTenant = true }: ProtectedRouteProps) => {
  const { loading, isAuthenticated, hasAnyRole } = useAuth();
  const { loading: tenantLoading, activeTenantId } = useTenant();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (loading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requiredRoles && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return <Navigate to="/dashboard" />;
  }
  if (requireTenant && isAuthenticated) {
    if (tenantLoading) return <AppLoader />;
    if (!activeTenantId && pathname !== "/onboarding") {
      return <Navigate to="/onboarding" />;
    }
  }
  return <>{children}</>;
};
