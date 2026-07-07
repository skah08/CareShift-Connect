import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AppLoader } from "./AppLoader";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import type { AppRole } from "@/interfaces";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  requireTenant?: boolean;
  requireWaiting?: boolean;
}

export const ProtectedRoute = ({ children, requiredRoles, requireTenant = true, requireWaiting }: ProtectedRouteProps) => {
  const { loading, isAuthenticated, hasAnyRole } = useAuth();
  const { loading: tenantLoading, activeTenantId } = useTenant();

  if (loading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  // Admins bypass tenant/waiting checks entirely
  const isAdmin = hasAnyRole(["admin"]);
  if (isAdmin) return <>{children}</>;

  if (requiredRoles && requiredRoles.length > 0 && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Waiting page — only for users without a tenant AND without admin role
  if (requireWaiting) {
    if (tenantLoading) return <AppLoader />;
    if (activeTenantId) return <Navigate to="/dashboard" />;
    return <>{children}</>;
  }

  if (requireTenant) {
    if (tenantLoading) return <AppLoader />;
    if (!activeTenantId) return <Navigate to="/waiting" />;
  }

  return <>{children}</>;
};
