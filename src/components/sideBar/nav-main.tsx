"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import React, { useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  useSidebar,
} from "../ui/sidebar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useMenuAccess } from "@/hooks/use-menu-access"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
  label,
  collapsible = false,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  icon: SectionIcon,
  className,
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
    alwaysShow?: boolean
    unauthorizedMessage?: string
    items?: {
      title: string
      url: string
      privilege_codes: string[]
      isUnderConstruction?: boolean
      alwaysShow?: boolean
      unauthorizedMessage?: string
    }[]
  }[]
  label?: string
  collapsible?: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  className?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const meetingId = searchParams.get("meetingId")
  const activityId = searchParams.get("activityId")
  const { canAccess } = useMenuAccess()
  const route = useRouter()
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen
  const setIsOpen = isControlled ? setControlledOpen! : setUncontrolledOpen
  const [isHoverOpen, setIsHoverOpen] = useState(false)

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

  const hasActiveChild = React.useMemo(() => {
    return items.some((item) => {
      if (isPathActive(item.url, item.activePaths, item.title)) return true
      if (item.items?.some((sub) => isPathActive(sub.url, undefined, item.title))) return true
      return false
    })
  }, [items, pathname, searchParams])

  const handleClick = (
    url?: string,
    codes?: string[],
    isUnderConstruction?: boolean,
    unauthorizedMessage?: string,
    title?: string
  ) => {
    if (isUnderConstruction) {
      toast.info("Under construction. Check back soon")
      return
    }
    if (!canAccess(codes)) {
      toast.error(unauthorizedMessage || (title ? `You are not authorized to use ${title}.` : "You are not authorized to access this feature."))
      return
    }
    if (url && url !== "#" && url !== "") route.push(url)
  }


  const menuContent = (
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
                        <a onClick={() => handleClick(subItem.url, subItem.privilege_codes, subItem.isUnderConstruction, subItem.unauthorizedMessage, subItem.title)}
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
              <a className="cursor-pointer flex items-center" onClick={() => handleClick(item.url, item.privilege_codes, item.isUnderConstruction, item.unauthorizedMessage, item.title)}>
                {iconEl}
                <span className="text-md leading-normal text-current group-data-[collapsible=icon]:hidden">{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )

  if (collapsible && isCollapsed) {
    return (
      <SidebarGroup className={cn("px-2 pt-0 pb-0", className)}>
        <SidebarGroupLabel className="pointer-events-none" />
        <SidebarMenu>
          <SidebarMenuItem>
            <HoverCard
              open={isHoverOpen}
              onOpenChange={setIsHoverOpen}
              openDelay={80}
              closeDelay={150}
            >
              <HoverCardTrigger asChild>
                <SidebarMenuButton
                  className={hasActiveChild ? "cursor-pointer bg-primary !text-white dark:!text-black rounded-md hover:bg-primary/90" : "cursor-pointer text-sidebar-foreground hover:bg-foreground/14 rounded-md"}
                  onClick={() => setIsHoverOpen((prev) => !prev)}
                >
                  {SectionIcon && (
                    <span className="shrink-0 flex items-center">
                      <SectionIcon className="w-[1.05rem] h-[1.05rem] text-current" />
                    </span>
                  )}
                  <span className="sr-only">{label}</span>
                </SidebarMenuButton>
              </HoverCardTrigger>
              <HoverCardContent
                side="right"
                align="start"
                sideOffset={12}
                className="w-52 bg-sidebar text-sidebar-foreground border-sidebar-border shadow-2xl rounded-lg p-1.5 z-50"
              >
                {label && (
                  <div className="text-xs text-sidebar-foreground/70 font-normal px-2.5 pt-1 pb-1 select-none">
                    {label}
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const hasSubItems = !!item.items?.length
                    const isActiveItem = isPathActive(item.url, item.activePaths, item.title)
                    const isActiveSub = hasSubItems ? item.items!.some((s) => isPathActive(s.url, undefined, item.title)) : false

                    const iconEl = item.icon && (
                      <span className="shrink-0 flex items-center">
                        <item.icon
                          className={`w-4 h-4 ${item.iconClassName ?? "text-current"}`}
                          style={item.iconColor ? { color: item.iconColor } : undefined}
                        />
                      </span>
                    )

                    return (
                      <div
                        key={item.title}
                        className={cn(
                          "cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors select-none",
                          isActiveItem || isActiveSub
                            ? "bg-primary !text-white dark:!text-black font-medium"
                            : "text-sidebar-foreground hover:bg-foreground/14 focus:bg-foreground/14 focus:text-sidebar-foreground"
                        )}
                        onClick={() => {
                          setIsHoverOpen(false)
                          handleClick(
                            item.url,
                            item.privilege_codes,
                            item.isUnderConstruction,
                            item.unauthorizedMessage,
                            item.title
                          )
                        }}
                      >
                        {iconEl}
                        <span className="leading-none">{item.title}</span>
                      </div>
                    )
                  })}
                </div>
              </HoverCardContent>
            </HoverCard>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  if (collapsible) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group/collapsible-section"
      >
        <SidebarGroup className={cn("px-2 pt-0 pb-0", isOpen && "pb-2", className)}>
          {isOpen ? (
            label && (
              <SidebarGroupLabel
                asChild
                className="cursor-pointer select-none hover:text-sidebar-foreground transition-colors group-data-[collapsible=icon]:pointer-events-none overflow-visible"
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer">
                  <span className="text-xs text-sidebar-foreground/70">{label}</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70 transition-transform duration-200 rotate-90 group-data-[collapsible=icon]:hidden" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
            )
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={label}
                    className={hasActiveChild ? "cursor-pointer bg-primary !text-white dark:!text-black rounded-md hover:bg-primary/90" : "cursor-pointer text-sidebar-foreground hover:bg-foreground/14 rounded-md"}
                  >
                    {SectionIcon && (
                      <span className="shrink-0 flex items-center">
                        <SectionIcon className="w-[1.05rem] h-[1.05rem] text-current" />
                      </span>
                    )}
                    <span className="text-md leading-normal text-current group-data-[collapsible=icon]:hidden">{label}</span>
                    <ChevronRight className="ml-auto text-current transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          <CollapsibleContent>
            {menuContent}
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    )
  }

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      {menuContent}
    </SidebarGroup>
  )
}
