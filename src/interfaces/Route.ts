import type { AppRole } from "./User";

export interface RouteConfig {
  path: string;
  labelKey: string;
  iconKey: string;
  isProtected: boolean;
  requiredRoles?: AppRole[];
  showInSidebar: boolean;
}