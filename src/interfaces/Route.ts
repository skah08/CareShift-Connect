import type { AppRole } from "./User";

export interface RouteConfig {
  path: string;
  labelKey: string;
  iconKey: string;
  isProtected: boolean;
  requiredRoles?: AppRole[];
  requiredTenantRoles?: string[];
  showInSidebar: boolean;
}