import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-2 sm:px-4 border-b border-border/40">
            <SidebarTrigger />
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};