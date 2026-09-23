import React, { useEffect, useState, useMemo } from "react";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { toast } from "sonner";
import { assignPrivilegeToRole } from "@/services/role-services";
import {
  getAllPrivilegeByUser,
  getAllPrivilegeByRole,
} from "@/services/privilege-services";
import { RefreshCw, Search, XIcon, ChevronDown, ShieldUser } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { safeParse } from "@/services/auth-service";

interface RoleViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: number;
  roleName?: string;
}

const RoleView: React.FC<RoleViewProps> = ({ open, onOpenChange, roleId, roleName }) => {
  // ── All hooks must be declared before any conditional return ──
  const canViewRole = usePrivilegeGuard("12") as boolean;

  const [privileges, setPrivileges] = useState<any[]>([]);
  const [userPrivileges, setUserPrivileges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [roleObject, setRoleObject] = useState<any>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const rolePrivilegeIds = useMemo(
    () => new Set(privileges.map((p: any) => p.id)),
    [privileges],
  );

  const filteredUserPrivileges = useMemo(() => {
    let list = userPrivileges;
    if (!roleObject) return [];
    const isCompanyRole =
      roleObject.companyId !== null && roleObject.companyId !== undefined;
    if (isCompanyRole) {
      list = list.filter((p: any) => p.level_type !== "env");
    }
    if (selectedGroups.size > 0) {
      list = list.filter((p: any) => selectedGroups.has(p.group || "Uncategorized"));
    }
    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (p: any) =>
        p?.privilege?.toLowerCase()?.includes(q) ||
        p?.group?.toLowerCase()?.includes(q) ||
        String(p?.access_key || "").toLowerCase().includes(q) ||
        p?.level_type?.toLowerCase()?.includes(q),
    );
  }, [userPrivileges, searchTerm, roleObject, selectedGroups]);

  const availableGroups = useMemo(() => {
    let list = userPrivileges;
    if (!roleObject) return [];
    const isCompanyRole =
      roleObject.companyId !== null && roleObject.companyId !== undefined;
    if (isCompanyRole) {
      list = list.filter((p: any) => p.level_type !== "env");
    }
    const groups = new Set(list.map((p: any) => p.group || "Uncategorized"));
    return Array.from(groups).sort() as string[];
  }, [userPrivileges, roleObject]);

  const groupedUserPrivileges = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredUserPrivileges.forEach((p: any) => {
      const g = p.group || "Uncategorized";
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    for (const g of Object.keys(groups)) {
      groups[g].sort((a: any, b: any) => (a.privilege || '').localeCompare(b.privilege || ''));
    }
    return groups;
  }, [filteredUserPrivileges]);

  const fetchRoleDetails = async () => {
    try {
      const { getRoleById } = await import("@/services/role-services");
      const result = await getRoleById(roleId);
      if (result && result.status === 200) {
        setRoleObject(result.data);
      }
    } catch (error) {
      console.error("Error fetching role details:", error);
    }
  };

  const fetchAllSystemPrivileges = async () => {
    setIsLoading(true);
    try {
      const { getAllPrivilege } = await import("@/services/privilege-services");
      const result = await getAllPrivilege();
      if (result && Array.isArray(result.data)) {
        setUserPrivileges(result.data);
      } else {
        toast.error("Failed to fetch system privileges");
        setUserPrivileges([]);
      }
    } catch (error) {
      toast.error("Failed to fetch system privileges");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrivilegesByUser = async (userId: number) => {
    setIsLoading(true);
    try {
      if (canViewRole) {
        const result = await getAllPrivilegeByUser(userId);
        if (result && Array.isArray(result.data)) {
          setUserPrivileges(result.data);
        } else {
          toast.error("Failed to fetch privileges");
          setUserPrivileges([]);
        }
      } else {
        toast.error("Not authorized to view this role");
        setUserPrivileges([]);
      }
    } catch {
      toast.error("Failed to fetch privileges");
      setUserPrivileges([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrivilegesByRole = async () => {
    setIsLoading(true);
    try {
      if (canViewRole) {
        const result = await getAllPrivilegeByRole(roleId);
        if (result && Array.isArray(result.data)) {
          setPrivileges(result.data);
        } else {
          toast.error("Failed to fetch privileges");
          setPrivileges([]);
        }
      } else {
        toast.error("Not authorized to view this role");
        setPrivileges([]);
      }
    } catch {
      toast.error("Failed to fetch privileges");
      setPrivileges([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    const isSystem = localCompanies.length === 0;
    if (isSystem) {
      fetchAllSystemPrivileges();
    } else {
      const user = localStorage.getItem("user");
      const userId = user ? JSON.parse(user).id : 0;
      fetchPrivilegesByUser(userId);
    }
    fetchPrivilegesByRole();
    fetchRoleDetails();
  }, [roleId]);

  const handleTogglePrivileges = async (
    privilegeIds: number[],
    targetState: boolean,
  ) => {
    if (privilegeIds.length === 0) return;
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      privilegeIds.forEach((id) => next.add(id));
      return next;
    });
    try {
      const response = await assignPrivilegeToRole(roleId, privilegeIds);
      if (response.status === 201 || response.status === 200) {
        if (response.data && Array.isArray(response.data.privileges)) {
          setPrivileges(response.data.privileges);
        } else {
          setPrivileges((prev) => {
            let next = [...prev];
            if (targetState) {
              privilegeIds.forEach((id) => {
                if (!next.some((p) => p.id === id)) {
                  const up = userPrivileges.find((u) => u.id === id);
                  if (up) next.push({ ...up, role_id: roleId });
                }
              });
            } else {
              const idSet = new Set(privilegeIds);
              next = next.filter((p) => !idSet.has(p.id));
            }
            return next;
          });
        }
        toast.success(
          privilegeIds.length > 1
            ? targetState ? "Privileges assigned" : "Privileges removed"
            : targetState ? "Privilege assigned" : "Privilege removed",
        );
      } else {
        toast.error("Failed to update privilege");
      }
    } catch {
      toast.error("Failed to update privilege");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        privilegeIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleGroupToggle = async (groupItems: any[], groupChecked: boolean) => {
    const targetState = !groupChecked;
    const idsToToggle = groupItems
      .filter((p) => rolePrivilegeIds.has(p.id) !== targetState)
      .map((p) => p.id);
    if (idsToToggle.length === 0) return;
    await handleTogglePrivileges(idsToToggle, targetState);
  };

  if (!open) return null;

  return (
    <div className="space-y-0">
      {/* ── Role header ── */}
      <div className="p-5 bg-gray-50 dark:bg-gray-900 border-b border-border flex justify-between items-start -mx-5 -mt-5 mb-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            {isLoading && !roleObject ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">
                    {[
                      roleName || roleObject?.role || "Role",
                      roleObject?.company?.company
                    ].filter(Boolean).join(" • ")}
                  </p>
                  {roleObject && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                        roleObject.isActive ? "bg-green-500" : "bg-red-500"
                      }`} />
                      {roleObject.isActive ? "Active" : "Inactive"}
                    </div>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {roleObject && (
                    <p className="text-[12px] text-muted-foreground/80 pt-0.5">
                      Created, {new Date(roleObject.createdAt || new Date()).toLocaleString('en-US', {
                        month: '2-digit', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="ml-2 flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Privileges section ── */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Privileges
        </p>

        {/* Search + filter + count + refresh */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0 max-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground shadow-none" />
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
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 bg-transparent"
              onClick={() => fetchPrivilegesByRole()}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center justify-center h-5 px-2 bg-primary text-primary-foreground rounded-full text-[11px] font-semibold">
              {privileges.length} / {userPrivileges.length}
            </span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredUserPrivileges.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-0">
            {Object.entries(groupedUserPrivileges).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, groupItems]) => {
              const items = groupItems as any[];
              const groupChecked = items.every((p) => rolePrivilegeIds.has(p.id));
              const isAnyItemUpdating = items.some((p) => updatingIds.has(p.id));

              return (
                <AccordionItem key={groupName} value={groupName} className="border-none relative group">
                  <AccordionTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-accent/50 hover:no-underline transition-colors pr-[100px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{groupName}</span>
                      <Badge variant="outline" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <div
                    className="absolute right-4 top-2 flex items-center gap-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAnyItemUpdating && (
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">All</span>
                    <Switch
                      checked={groupChecked}
                      disabled={isAnyItemUpdating}
                      onCheckedChange={() => handleGroupToggle(items, groupChecked)}
                    />
                  </div>
                  <AccordionContent className="pt-1">
                    <div className="ml-2 pl-4 space-y-0">
                      {items.map((p) => {
                        const checked = rolePrivilegeIds.has(p.id);
                        const isThisItemLoading = updatingIds.has(p.id);
                        return (
                          <div
                            key={p.id}
                            className="py-1 pl-3 pr-4 flex items-center justify-between gap-2 hover:bg-accent/50 transition-colors border-b"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm truncate flex items-center gap-1.5">
                                <span className="truncate">{p.privilege}</span>
                                {p.level_type && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 h-4 px-1.5 whitespace-nowrap flex-shrink-0"
                                  >
                                    {p.level_type.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {p.description || `ID: ${p.id}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isThisItemLoading && (
                                <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                              )}
                              <Switch
                                checked={checked}
                                disabled={isThisItemLoading}
                                onCheckedChange={async () => {
                                  await handleTogglePrivileges([p.id], !checked);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="text-center py-12">
            {/* <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-3" /> */}
            <ShieldUser className="mx-auto h-8 w-8 opacity-30" />
            <p className="text-sm text-muted-foreground">No assignable privileges found</p>
            {/* <p className="text-xs text-muted-foreground mt-1">
              {searchTerm ? "Try adjusting your search" : "No privileges available"}
            </p> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleView;
