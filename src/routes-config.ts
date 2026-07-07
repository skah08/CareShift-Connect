import type { RouteConfig } from "@/interfaces";

// Central route registry. Every route declares whether it is protected and,
// optionally, which roles may access it. The Sidebar and ProtectedRoute
// component both read from this list.
export const publicRoutes: RouteConfig[] = [
  { path: "/", labelKey: "app.name", iconKey: "dashboard", isProtected: false, showInSidebar: false },
  { path: "/login", labelKey: "common.signIn", iconKey: "dashboard", isProtected: false, showInSidebar: false },
];

export const protectedRoutes: RouteConfig[] = [
  {
    path: "/dashboard",
    labelKey: "sidebar.dashboard",
    iconKey: "dashboard",
    isProtected: false,
    showInSidebar: true,
  },
  {
    path: "/calendar",
    labelKey: "sidebar.calendar",
    iconKey: "calendar",
    isProtected: false,
    showInSidebar: true,
  },
  {
    path: "/staff",
    labelKey: "sidebar.staff",
    iconKey: "staff",
    isProtected: false,
    requiredRoles: ["admin"],
    showInSidebar: true,
  },
  {
    path: "/departments",
    labelKey: "sidebar.departments",
    iconKey: "departments",
    isProtected: false,
    requiredRoles: ["admin"],
    showInSidebar: true,
  },
  {
    path: "/permissions",
    labelKey: "sidebar.permissions",
    iconKey: "permissions",
    isProtected: false,
    requiredRoles: ["admin"],
    showInSidebar: true,
  },
  {
    path: "/admin/tenants",
    labelKey: "sidebar.tenants",
    iconKey: "tenants",
    isProtected: false,
    requiredRoles: ["admin"],
    showInSidebar: true,
  },
  {
    path: "/admin/compliance",
    labelKey: "sidebar.compliance",
    iconKey: "compliance",
    isProtected: false,
    requiredRoles: ["admin"],
    showInSidebar: true,
  },
  {
    path: "/admin/templates",
    labelKey: "sidebar.templates",
    iconKey: "templates",
    isProtected: false,
    requiredRoles: ["admin"],
    showInSidebar: true,
  },
];

export const allRoutes: RouteConfig[] = [...publicRoutes, ...protectedRoutes];
