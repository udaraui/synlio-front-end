import React, { useState, useMemo } from "react";
import { User } from "@/interfaces/user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shield, ChevronDown, ShieldUser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

function RolesPermissions({
  user,
  isSystemUser,
  filterCompanyId,
}: {
  user: User;
  isSystemUser?: boolean;
  filterCompanyId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // Toggle function for collapsible groups
  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const groupPrivilegesByGroup = (privileges: any[]) => {
    const grouped = privileges.reduce((acc, privilege) => {
      const group = privilege.group || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(privilege);
      return acc;
    }, {} as Record<string, any[]>);
    // Sort privileges within each group alphabetically
    for (const group of Object.keys(grouped)) {
      grouped[group].sort((a: any, b: any) =>
        (a.privilege || '').localeCompare(b.privilege || '')
      );
    }
    return grouped;
  };

  // Filter user company roles based on active company and search term
  const filteredUserCompanyRoles = useMemo(() => {
    // Get active company from localStorage
    let selectedCompany = null;
    try {
      selectedCompany = JSON.parse(
        localStorage.getItem("active_company") || "null"
      );
    } catch (e) {
      console.error("Failed to parse active_company", e);
    }

    const targetCompanyId = isSystemUser
      ? filterCompanyId
        ? parseInt(filterCompanyId)
        : null
      : selectedCompany?.companyId;

    // First filter by company ID if one is selected
    let companyFilteredRoles = user.userCompanyRoles;
    if (targetCompanyId) {
      companyFilteredRoles = user.userCompanyRoles?.filter((ucr) => {
        const cid = Number(
          ucr.company?.id ??
          (ucr as any).companyId ??
          (ucr as any).company_id ??
          0
        );
        return cid === Number(targetCompanyId);
      });
    }

    // Then filter by search term if provided
    if (!searchTerm) return companyFilteredRoles;

    return companyFilteredRoles?.filter((userCompanyRole) => {
      // Search in role name
      if (
        userCompanyRole.role?.role
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) {
        return true;
      }

      // Search in privileges
      return userCompanyRole.role?.privileges?.some(
        (privilege: any) =>
          privilege.privilege
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          privilege.access_key
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          privilege.group?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [user.userCompanyRoles, searchTerm, isSystemUser, filterCompanyId]);

  // Collect all unique privilege groups across all visible roles for the filter popover
  const availableGroups = useMemo(() => {
    let selectedCompany = null;
    try {
      selectedCompany = JSON.parse(localStorage.getItem("active_company") || "null");
    } catch (e) {}
    const targetCompanyId = isSystemUser
      ? filterCompanyId ? parseInt(filterCompanyId) : null
      : selectedCompany?.companyId;
    let roles = user.userCompanyRoles;
    if (targetCompanyId) {
      roles = roles?.filter((r) => r.company?.id === targetCompanyId);
    }
    const groups = new Set<string>();
    roles?.forEach((r) => {
      r.role?.privileges?.forEach((p: any) => {
        groups.add(p.group || "Other");
      });
    });
    return Array.from(groups).sort();
  }, [user.userCompanyRoles, isSystemUser, filterCompanyId]);

  // Get filtered privileges for a specific role
  const getFilteredPrivileges = (privileges: any[]) => {
    let list = privileges;
    if (selectedGroups.size > 0) {
      list = list.filter((p) => selectedGroups.has(p.group || "Other"));
    }
    if (!searchTerm) return list;
    return list.filter(
      (privilege) =>
        privilege.privilege?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        privilege.access_key
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        privilege.group?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="rounded-sm space-y-2">
      {/* Search + filter + role count */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 max-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-7 text-xs bg-background shadow-none placeholder:text-xs"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`h-7 px-2 text-xs font-normal bg-background ${selectedGroups.size > 0 ? "text-foreground" : "text-muted-foreground"}`}
              >
                {selectedGroups.size > 0 ? `${selectedGroups.size} Selected` : "All"}
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {availableGroups.map((group) => (
                  <label key={group} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={selectedGroups.has(group)}
                      onChange={() =>
                        setSelectedGroups((prev) => {
                          const next = new Set(prev);
                          next.has(group) ? next.delete(group) : next.add(group);
                          return next;
                        })
                      }
                    />
                    <span className="text-xs truncate">{group}</span>
                  </label>
                ))}
              </div>
              {selectedGroups.size > 0 && (
                <div className="border-t px-2 py-1.5">
                  <button
                    onClick={() => setSelectedGroups(new Set())}
                    className="w-full text-xs text-center text-muted-foreground hover:text-foreground py-0.5 rounded"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="flex items-center justify-center h-5 w-5 bg-primary text-primary-foreground rounded-full text-[11px] font-semibold">
            {filteredUserCompanyRoles?.length || 0}
          </span>
          <span className="text-sm font-medium text-foreground">
            {(filteredUserCompanyRoles?.length || 0) === 1 ? "Role" : "Roles"}
          </span>
        </div>
      </div>

      <Separator className="mt-4" />

      {/* Content */}
      {filteredUserCompanyRoles && filteredUserCompanyRoles.length > 0 ? (
        <div className="space-y-3">
          {filteredUserCompanyRoles.map((userCompanyRole, index) => {
            const filteredPrivileges = getFilteredPrivileges(
              userCompanyRole.role?.privileges || []
            );
            const groupedPrivileges =
              groupPrivilegesByGroup(filteredPrivileges);

            return (
              <div key={userCompanyRole.id} className="">
                <div className="">
                  <div className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {userCompanyRole.role?.role || "Unknown Role"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <span className="text-primary">{filteredPrivileges.length}</span>
                      Privileges
                    </Badge>
                  </div>
                </div>

                {filteredPrivileges.length > 0 && (
                  <div className="pt-1">
                    <div className="space-y-0">
                      {Object.entries(groupedPrivileges).sort(([a], [b]) => a.localeCompare(b)).map(
                        ([group, privileges]) => {
                          const groupKey = `${userCompanyRole.id}-${group}`;
                          const isOpen = openGroups[groupKey] || false;

                          return (
                            <Collapsible
                              key={groupKey}
                              open={isOpen}
                              onOpenChange={() => toggleGroup(groupKey)}
                            >
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-accent/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{group}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {(privileges as any[]).length}
                                  </Badge>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2">
                                <div className="ml-2 pl-4 space-y-1">
                                  {(privileges as any[]).map((privilege) => (
                                    <div
                                      key={privilege.id}
                                      className="py-1 px-3 flex items-start justify-between gap-2 hover:bg-accent/50 transition-colors border-b"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm truncate">
                                          {privilege.privilege}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">{privilege.description}</div>
                                      </div>
                                      <code className="text-xs text-muted-foreground mt-0.5 flex-shrink-0 max-w-[90px] truncate">
                                        {privilege.access_key}
                                      </code>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
                {index < filteredUserCompanyRoles.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShieldUser className="h-8 w-8 opacity-30" />
          <h3 className="text-lg text-muted-foreground">
            {searchTerm
              ? "No matching privileges found"
              : "No company roles assigned"}
          </h3>
          {/* <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "Try adjusting your search criteria"
              : "This user has no roles or privileges assigned"}
          </p> */}
        </div>
      )}
    </div>
  );
}

export default RolesPermissions;
