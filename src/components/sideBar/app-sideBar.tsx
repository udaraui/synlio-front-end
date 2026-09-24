"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar,
  Home,
  LayoutDashboard,
  Ticket,
  User,
  Users,
  PanelLeft,
  Contact,
  Shapes,
  BriefcaseBusiness,
  Activity,
  ShieldUser,
  ChartNoAxesCombined,
  BotMessageSquare,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import logo from "../../../public/logo.png";
import { NavMain } from "./nav-main";
import { NavMasters } from "./nav-masters";
import { CompanySwitcher } from "./company-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Company } from "@/interfaces/company";
import {
  getLocalUser,
  getUserCompanyIdByUserId,
  getLocalActiveCompany,
  safeParse,
} from "@/services/auth/auth-service";
import { usePrivilege } from "@/contexts/userPrivilege.context";
import { useMenuAccess } from "@/hooks/use-menu-access";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return safeParse(localStorage.getItem("companies")) || [];
    } catch {
      return [];
    }
  });
  const { setActiveCompany: setPrivilegeCompany } = usePrivilege();
  const { canAccess } = useMenuAccess();
  const { toggleSidebar } = useSidebar();
  const [isSystemUser, setIsSystemUser] = useState(false);

  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    setIsSystemUser(localCompanies.length === 0);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const user = await getLocalUser();
        if (!user?.id) return;

        const localActiveCompany = await getLocalActiveCompany();
        const userCompanyResponse = await getUserCompanyIdByUserId(user.id);

        if (userCompanyResponse.status === 200 || userCompanyResponse.status === 201) {
          const allUserCompanies = userCompanyResponse.data;
          // Only show companies that are actively enabled
          const userCompanies = allUserCompanies.filter(
            (c: any) => c.isActive === 'active',
          );
          setCompanies(userCompanies);
          localStorage.setItem("companies", JSON.stringify(userCompanies));
          let selectedCompany = userCompanies.length > 0 ? userCompanies[0] : 0;
          if (localActiveCompany && userCompanies.length > 0 && localActiveCompany.userId === user.id) {
            const foundCompany = userCompanies.find(
              (company: any) => company.companyId === localActiveCompany.companyId,
            );
            if (foundCompany) selectedCompany = foundCompany;
          }
          localStorage.setItem("active_company", JSON.stringify(selectedCompany));
          setActiveCompany(selectedCompany);
          setPrivilegeCompany(typeof selectedCompany === "object" ? selectedCompany.companyId : 0);

        } else {
          toast.error(userCompanyResponse.data.message || "Failed to fetch companies");
        }
      } catch (error) {
        console.error("Error fetching sidebar data:", error);
        toast.error("Failed to load user data");
      }
    };
    fetchInitialData();
  }, []);

  const dashboardData = React.useMemo(() => {
    const items = [
      { title: "Home", url: "/home", icon: Home, privilege_codes: [] },
      { title: "Synalytics", url: "/synalytics", icon: ChartNoAxesCombined, privilege_codes: [], isUnderConstruction: true },
    ];
    return isSystemUser ? [] : items;
  }, [isSystemUser]);

  const spacesData = React.useMemo(() => {
    const items = [
      {
        title: "Project",
        url: "/task-management/task-space",
        icon: LayoutDashboard,
        privilege_codes: ["44"],
        activePaths: ["/task-management/task-space", "/task-management/task"],
      },
      {
        title: "Ticket",
        url: "/ticket-management/ticket-space",
        icon: Ticket,
        privilege_codes: ["100"],
        activePaths: ["/ticket-management/ticket-space", "/ticket-management/ticket"],
      },
      {
        title: "Pulse",
        url: "/pulse",
        icon: Activity,
        iconClassName: "text-yellow-400",
        iconColor: "#facc15",
        privilege_codes: ["109"],
        activePaths: ["/pulse"],
      },
    ];
    return isSystemUser ? items.filter((item) => item.title !== "Pulse") : items;
  }, [isSystemUser]);

  const aiData = React.useMemo(() => [
    { title: "Ask Synlio", url: "/chat", icon: BotMessageSquare, privilege_codes: [], isUnderConstruction: true },
    { title: "Insights", url: "/ai-insights", icon: Brain, privilege_codes: [], isUnderConstruction: true },
  ], []);

  const resourceData = React.useMemo(() => [
    { title: "Resource", url: "/resource/management", icon: Users, privilege_codes: ["38"], activePaths: ["/resource/management"] },
    { title: "Resource Group", url: "/resource/pools", icon: Contact, privilege_codes: ["42"], activePaths: ["/resource/pools"] },
    { title: "Skill", url: "/resource/skills", icon: Shapes, privilege_codes: ["17"], activePaths: ["/resource/skills"] },
  ], []);

  const mastersData = React.useMemo(() => [
    { title: "Company", url: "/environment/company", icon: BriefcaseBusiness, privilege_codes: ["4", "8"] },
    { title: "Calendar", url: "/resource/calendar", icon: Calendar, privilege_codes: ["29"], activePaths: ["/resource/calendar"] },
    { title: "Role", url: "/environment/roles", icon: ShieldUser, privilege_codes: ["12"] },
    { title: "User", url: "/user-management", icon: User, privilege_codes: ["16"] },
  ], []);

  const filterItems = React.useCallback((list: any[]): any[] =>
    list.map((item): any => {
      const hasSubs = Array.isArray(item.items) && item.items.length > 0;
      const allowed = canAccess(item.privilege_codes);
      const subs: any[] = hasSubs ? filterItems(item.items) : [];
      if (!hasSubs) return allowed ? { ...item, items: [] } : null;
      return subs.length > 0 || allowed ? { ...item, items: subs } : null;
    }).filter(Boolean), [canAccess]);

  const visibleDashboardItems = React.useMemo(() => filterItems(dashboardData), [dashboardData, filterItems]);
  const visibleSpacesItems = React.useMemo(() => filterItems(spacesData), [spacesData, filterItems]);
  const visibleAiItems = React.useMemo(() => filterItems(aiData), [aiData, filterItems]);
  const visibleResourceItems = React.useMemo(() => filterItems(resourceData), [resourceData, filterItems]);
  const visibleMastersItems = React.useMemo(() => filterItems(mastersData), [mastersData, filterItems]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySwitcher companies={companies as Company[]} fistActiveCompany={activeCompany} />
      </SidebarHeader>
      <SidebarContent className="sidebar gap-3 pt-1">
        {visibleDashboardItems.length > 0 && <NavMain items={visibleDashboardItems} />}
        {visibleSpacesItems.length > 0 && (<NavMain items={visibleSpacesItems} label="Spaces" />)}
        {visibleAiItems.length > 0 && (<NavMain items={visibleAiItems} label="AI" />)}
        {visibleResourceItems.length > 0 && <NavMain items={visibleResourceItems} label="Team" />}
        <NavMasters masters={visibleMastersItems} />
      </SidebarContent>
      <SidebarFooter className="">
        {/* Expanded */}
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1.5 pl-1.5 rounded-sm min-w-0">
            <Image src={logo} alt="Synlio" width={28} height={28} className="object-contain flex-shrink-0" />
            <span className="text-md font-semibold text-gray-100 truncate tracking-widest">Synlio</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}
            className="h-8 w-8 flex-shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer" title="Collapse sidebar">
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
        {/* Collapsed */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-2">
          <Image src={logo} alt="Synlio" width={22} height={22} className="object-contain" />
          <Button variant="ghost" size="icon" onClick={toggleSidebar}
            className="h-8 w-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer" title="Expand sidebar">
            <PanelLeft className="h-4 w-4 rotate-180" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
