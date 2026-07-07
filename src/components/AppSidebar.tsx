import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, CalendarDays, Users, Building2, Shield, Building, Scale, Clock, BookOpen, Map, LogOut, type LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { protectedRoutes } from "@/routes-config";
import { TenantSwitcher } from "@/components/TenantSwitcher";

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  staff: Users,
  departments: Building2,
  permissions: Shield,
  tenants: Building,
  compliance: Scale,
  templates: Clock,
  gettingStarted: BookOpen,
  roadmap: Map,
};

export const AppSidebar = () => {
  const { t } = useTranslation();
  const { state, isMobile } = useSidebar();
  const { signOut, user, hasAnyRole } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const collapsed = state === "collapsed";

  const visible = protectedRoutes.filter((r) => {
    if (!r.showInSidebar) return false;
    if (r.requiredRoles && !hasAnyRole(r.requiredRoles)) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
            H
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold leading-tight">{t("app.name")}</span>
              <span className="text-xs text-muted-foreground">{t("app.tagline")}</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3">
            <TenantSwitcher />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((route) => {
                const Icon = iconMap[route.iconKey] ?? LayoutDashboard;
                const active = pathname === route.path;
                return (
                  <SidebarMenuItem key={route.path}>
                    <SidebarMenuButton asChild isActive={active} size={isMobile ? "lg" : "default"} tooltip={t(route.labelKey)}>
                      <Link to={route.path} className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {!collapsed && <span>{t(route.labelKey)}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-3">
        {user && !collapsed && (
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{user.email}</div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                void signOut();
              }}
              size={isMobile ? "lg" : "default"}
              tooltip={t("common.logout")}
            >
              <LogOut className="size-4" />
              {!collapsed && <span>{t("common.logout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};