import { AppSidebar } from "@/components/sideBar/app-sideBar";
import NavBar from "@/components/navBar/navBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/contexts/breadcrumb.context";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { cookies } from "next/headers";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Synlio',
};

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
      <div className={`overflow-hidden text-foreground`}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <BreadcrumbProvider>
            <NavBar />
            <AppSidebar />
            <main
              className={`flex w-full flex-col overflow-hidden`}
              style={{ marginTop: `${NAVBAR_HEIGHT}px`, height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
            >
              {children}
            </main>
          </BreadcrumbProvider>
        </SidebarProvider>
      </div>
  );
};
export default Layout;
