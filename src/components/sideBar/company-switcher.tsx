"use client";

import * as React from "react";
import { ChevronsUpDown, UserStar } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { API_URL } from "@/lib/constants";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Company } from "@/interfaces/company";
import { useEffect, useState } from "react";
import { usePrivilege } from "@/contexts/userPrivilege.context";
import { toast } from "sonner";

function initials(name?: string) {
  const cleanName = (name ?? "").trim();
  if (!cleanName) return "?";

  const words = cleanName.split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function CompanySwitcher({
  companies,
  fistActiveCompany,
}: {
  companies: Company[];
  fistActiveCompany: any;
}) {
  const { isMobile } = useSidebar();
  const [activeCompany, setActiveCompany] = useState<any>(
    fistActiveCompany || (companies.length > 0 ? companies[0] : null),
  );
  const { setActiveCompany: setPrivilegeCompany } = usePrivilege();

  // Update activeCompany when fistActiveCompany changes
  useEffect(() => {
    if (fistActiveCompany) {
      setActiveCompany(fistActiveCompany);
    } else if (companies.length > 0 && !activeCompany) {
      setActiveCompany(companies[0]);
    }
  }, [fistActiveCompany, companies]);

  const onSetDefaultCompany = async (e: React.MouseEvent, company: any) => {
    e.stopPropagation();
    const accessToken = Cookies.get("accessToken");

    try {
      const response = await axios.put(
        `${API_URL}/user/default-company/${company.companyId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-selected-company": String(company.companyId)
          },
          withCredentials: true,
        },
      );

      if (response.status === 200) {
        toast.success("Default company updated");
        // Update local storage companies list
        let storedCompanies = [];
        try {
          const raw = localStorage.getItem("companies");
          if (raw && raw !== "undefined") {
            storedCompanies = JSON.parse(raw);
          }
        } catch (error) {
          console.error("Error parsing companies from localStorage:", error);
        }
        const updatedCompanies = storedCompanies.map((c: any) => ({
          ...c,
          is_default: c.companyId === company.companyId,
        }));
        localStorage.setItem("companies", JSON.stringify(updatedCompanies));

        // Refresh to apply changes everywhere (easier than complex state sync across modules)
        window.location.reload();
      }
    } catch (error) {
      toast.error("Failed to set default company");
    }
  };

  const onSwitchCompany = (company: any) => {
    // Persist selected company
    localStorage.setItem("active_company", JSON.stringify(company));
    // Re-derive privileges from the JWT for the newly selected company
    setPrivilegeCompany(company.companyId);
    window.location.href = "/home";
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Alt key is pressed and it's a number key (1-9)
      if (event.altKey && event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        const companyIndex = parseInt(event.key) - 1;

        // Check if the company exists at that index
        if (companies[companyIndex]) {
          setActiveCompany(companies[companyIndex]);
          onSwitchCompany(companies[companyIndex]);
        }
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [companies]);

  if (!activeCompany && companies.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="py-5 group-data-[collapsible=icon]:!py-5.5 bg-sidebar-accent/50 hover:bg-sidebar-accent/50 cursor-pointer group-data-[collapsible=icon]:!bg-transparent"
          >
            <div className="flex aspect-square size-8 items-center justify-center">
              <Avatar className="h-8 w-8 !ring-0 !border-0 bg-transparent">
                <AvatarImage src="/logo.png" alt="Synlio Admin" className="object-contain" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <UserStar className="size-[18px]" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="grid flex-1 text-left text-lg leading-tight">
              <span className="truncate font-medium">
                Synlio Admin
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeCompany) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer py-5 group-data-[collapsible=icon]:!py-6 bg-sidebar-accent/50 hover:bg-sidebar-accent/70 group-data-[collapsible=icon]:!bg-transparent"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <Avatar className="h-8 w-8 !ring-0 !border-0">
                  <AvatarImage
                    src={activeCompany.logo}
                    alt={activeCompany.company}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-sm bg-primary font-semibold">
                    {initials(activeCompany.company)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid flex-1 gap-0.5 text-left text-lg leading-tight">
                <span className="truncate font-medium">
                  {activeCompany.company}
                </span>
                {/*<span className="truncate text-xs">*/}
                {/*  {activeCompany.company_code}*/}
                {/*</span>*/}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg p-1"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal px-2 py-1.5">
              Companies
            </DropdownMenuLabel>

            {companies.map((company, index) => {
              return (
                <DropdownMenuItem
                  key={`${company.companyId}-${index}`}
                  onClick={() => {
                    setActiveCompany(company);
                    onSwitchCompany(company);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                >
                  {/* Active checkmark */}
                  {/*{isActive && <CircleCheck className="size-3.5 shrink-0 text-primary" />}*/}

                  {/* Small square avatar */}
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full border overflow-hidden bg-background">
                    <Avatar className="size-6 rounded-sm ring-0 hover:ring-0">
                      <AvatarImage
                        src={company.logo || undefined}
                        alt={company.company}
                        className="object-contain"
                      />
                      <AvatarFallback className="!text-[10px]">
                        {initials(company.company)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Company name */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate text-sm">{company.company}</span>
                    {company.is_default && (
                      <span className="text-[10px] text-primary leading-none mt-0.5">
                        Default
                      </span>
                    )}
                  </div>

                  <span className="text-muted-foreground text-xs">
                    Alt {index + 1}
                  </span>

                  {/* Keyboard shortcut */}

                  {/*<KbdGroup>*/}
                  {/*  <Kbd>Alt</Kbd>*/}
                  {/*  <Kbd>{index + 1}</Kbd>*/}
                  {/*</KbdGroup>*/}
                </DropdownMenuItem>
              );
            })}

            {activeCompany && !activeCompany.is_default && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) =>
                    onSetDefaultCompany(
                      e as unknown as React.MouseEvent,
                      activeCompany,
                    )
                  }
                  className="px-2 py-1.5 text-xs text-primary cursor-pointer"
                >
                  Set current company as default
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
