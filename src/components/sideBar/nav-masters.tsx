'use client';

import {
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { CollapsibleContent } from '@radix-ui/react-collapsible';
import { SidebarMenuSub } from '@/components/ui/sidebar';
import { SidebarMenuSubItem } from '@/components/ui/sidebar';
import { SidebarMenuSubButton } from '@/components/ui/sidebar';
import { useMenuAccess } from '@/hooks/use-menu-access';
import { usePathname, useRouter } from 'next/navigation';

export function NavMasters({masters}: {
  masters: {
    title: string;
    url: string;
    icon: LucideIcon;
    privilege_codes: string[];
    items: {
      title: string;
      url: string;
      icon: LucideIcon;
      privilege_codes: string[];
      description: string;
    }[];
  }[];
}) {

  const { canAccess } = useMenuAccess();
  const route = useRouter();
  const pathname = usePathname();

  const isPathActive = (url: string) =>
    pathname === url || pathname.startsWith(url + '/');

  const handleClick = (url?: string, codes?: string[]) => {
    if (!canAccess(codes)) return;
    if (url && url !== '#' && url !== '') route.push(url);
  };

  return (
    <SidebarGroup className="py-1">
      {masters.length > 0 && (
        <SidebarGroupLabel>System</SidebarGroupLabel>
      )}
      <SidebarMenu>
        {masters.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          const isActiveMain = isPathActive(item.url);
          const isActiveSub = hasSubItems
            ? item.items?.some((s) => isPathActive(s.url))
            : false;

          return hasSubItems ? (
            <Collapsible
              key={item.title}
              asChild
              className="group/collapsible py-0.5"
            >
              <SidebarMenuItem className="cursor-pointer">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={`${isActiveSub ? 'cursor-pointer bg-primary !text-white dark:!text-black rounded-md hover:bg-white/14' : 'cursor-pointer text-sidebar-foreground hover:bg-foreground/14 rounded-md'}`}
                  >
                    {item.icon && (
                      <span className="shrink-0 flex items-center">
                        <item.icon className="w-[1.05rem] h-[1.05rem] text-current" />
                      </span>
                    )}
                    <span className="text-[0.95rem] leading-none text-current pt-1">{item.title}</span>
                    <ChevronRight className="ml-auto text-current transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubActive = isPathActive(subItem.url);
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className={isSubActive ? "cursor-pointer ps-4 text-primary" : "cursor-pointer ps-4 text-sidebar-foreground/80 hover:text-primary"}
                          >
                            <a
                              onClick={() => handleClick(subItem.url, subItem.privilege_codes)}
                              className="flex items-center rounded-md min-h-6 mt-2 cursor-pointer text-current"
                            >
                              <span className="leading-tight pt-0.5 text-current">{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                className={`${isActiveMain ? 'cursor-pointer bg-primary !text-white dark:!text-black rounded-md hover:bg-primary/90' : 'cursor-pointer text-sidebar-foreground hover:bg-foreground/14 rounded-md'}`} 
                tooltip={item.title} asChild>
                <a className="cursor-pointer flex items-center" onClick={() => handleClick(item.url, item.privilege_codes)}>
                  {item.icon && (
                    <span className="shrink-0 flex items-center">
                      <item.icon className="w-[1.05rem] h-[1.05rem] text-current" />
                    </span>
                  )}
                   <span className="text-md leading-normal text-current">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
