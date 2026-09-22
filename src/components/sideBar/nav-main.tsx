"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import type React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "../ui/sidebar"
import { useMenuAccess } from "@/hooks/use-menu-access"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    iconClassName?: string
    iconColor?: string
    privilege_codes: string[]
    activePaths?: string[]
    isUnderConstruction?: boolean
    items?: { title: string; url: string; privilege_codes: string[]; isUnderConstruction?: boolean }[]
  }[]
  label?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const meetingId = searchParams.get("meetingId")
  const activityId = searchParams.get("activityId")
  const { canAccess } = useMenuAccess()
  const route = useRouter()

  // When navigating through Pulse's "Link to Task" flow (meetingId or activityId in URL),
  // task-management paths belong to Pulse — not to Project.
  const TASK_MGMT_PATHS = ["/task-management/task-space", "/task-management/task"]

  const isPathActive = (url: string, activePaths?: string[], itemTitle?: string) => {
    const allPaths = [url, ...(activePaths ?? [])]

    if (meetingId || activityId) {
      // In link mode: Pulse is active for task-management paths, Project is not
      const isTaskMgmtPath = TASK_MGMT_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      )
      if (isTaskMgmtPath) {
        return itemTitle === "Pulse"
      }
    }

    return allPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  }

  const handleClick = (url?: string, codes?: string[], isUnderConstruction?: boolean) => {
    if (isUnderConstruction) {
      toast.info("Under construction. Check back soon")
      return
    }
    if (!canAccess(codes)) return
    if (url && url !== "#" && url !== "") route.push(url)
  }


  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = !!item.items?.length
          const isActiveMain = isPathActive(item.url, item.activePaths, item.title)
          const isActiveSub = hasSubItems ? item.items!.some((s) => isPathActive(s.url, undefined, item.title)) : false

          const iconEl = item.icon && (
            <span className="shrink-0 flex items-center">
              <item.icon
                className={`w-[1.05rem] h-[1.05rem] ${item.iconClassName ?? "text-current"}`}
                style={item.iconColor ? { color: item.iconColor } : undefined}
              />
            </span>
          )

          return hasSubItems ? (
            <Collapsible key={item.title} asChild className="group/collapsible py-0.5">
              <SidebarMenuItem className="cursor-pointer">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} asChild
                    className={isActiveSub ? "cursor-pointer bg-primary !text-white dark:!text-black rounded-md hover:bg-primary/90" : "cursor-pointer text-sidebar-foreground hover:bg-foreground/14 rounded-md"}>
                    <a className="flex items-center cursor-pointer">
                      {iconEl}
                      <span className="text-md leading-none text-current group-data-[collapsible=icon]:hidden">{item.title}</span>
                      <ChevronRight className="ml-auto text-current transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </a>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items!.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild
                          className={isPathActive(subItem.url) ? "cursor-pointer ps-4 text-primary" : "cursor-pointer ps-4 text-sidebar-foreground/80 hover:text-primary"}>
                          <a onClick={() => handleClick(subItem.url, subItem.privilege_codes, subItem.isUnderConstruction)}
                            className="flex items-center rounded-md min-h-6 mt-2 cursor-pointer">
                            <span className="leading-tight">{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                className={isActiveMain ? "cursor-pointer bg-primary !text-white dark:!text-black rounded-md hover:bg-primary/90" : "cursor-pointer text-sidebar-foreground hover:bg-foreground/14 rounded-md"} 
                tooltip={item.title} asChild>
                <a className="cursor-pointer flex items-center" onClick={() => handleClick(item.url, item.privilege_codes, item.isUnderConstruction)}>
                  {iconEl}
                  <span className="text-md leading-normal text-current group-data-[collapsible=icon]:hidden">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
