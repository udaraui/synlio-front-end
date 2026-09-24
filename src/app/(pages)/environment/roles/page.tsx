"use client";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { Role } from "@/interfaces/role";
import React, { useEffect, useState } from "react";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { toast } from "sonner";
import { getRoleById, loadRoles } from "@/services/user-management/role-services";
import RoleList from "./components/role_list";
import RoleCreateDrawer from "./components/role_create_drawer";
import RoleEditDrawer from "./components/role_edit_drawer";
import RoleView from "./components/role_view";
import { safeParse } from "@/services/auth/auth-service";
import { getAllCompany } from "@/services/company-management/company-services";

function Page() {
  const { setBreadcrumbs } = useBreadcrumb();
  const [allRolesGetIsLoading, setAllRolesGetIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [roleTerm, setRoleTerm] = useState("");
  const [statusTerm, setStatusTerm] = useState("");
  const [debouncedRoleTerm, setDebouncedRoleTerm] = useState("");
  const [debouncedStatusTerm, setDebouncedStatusTerm] = useState("");

  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string>("");
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openCreateRoleDialog, setOpenCreateRoleDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);

  const [isSystemUser, setIsSystemUser] = useState(false);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const [debouncedFilterCompanyId, setDebouncedFilterCompanyId] = useState("");

  type SortOption = 'name-asc' | 'name-desc' | 'updatedAt-desc' | 'updatedAt-asc' | 'createdAt-desc' | 'createdAt-asc' | '';
  const [sortOption, setSortOption] = useState<SortOption>('');

  const canViewRole = usePrivilegeGuard("12") as boolean;

  useEffect(() => {
    setBreadcrumbs([{ label: "Role", href: "/environment/roles", isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    const isSystem = localCompanies.length === 0;
    setIsSystemUser(isSystem);
    if (isSystem) {
      const fetchCompanies = async () => {
        try {
          const result = await getAllCompany();
          const list = result.data || [];
          setAllCompanies(list);
        } catch (error) {
          console.error("Failed to fetch companies:", error);
        }
      };
      fetchCompanies();
    }
  }, []);

  const fetchRoles = async () => {
    setAllRolesGetIsLoading(true);
    const selectedCompany = safeParse(localStorage.getItem("active_company"));
    try {
      const filters = [
        ...(!isSystemUser && selectedCompany?.companyId
          ? [{ field: "companyId", value: selectedCompany.companyId, matchMode: "equals" }]
          : []),
        ...(isSystemUser && debouncedFilterCompanyId
          ? [{ field: "companyId", value: parseInt(debouncedFilterCompanyId), matchMode: "equals" }]
          : []),
        ...(debouncedRoleTerm
          ? [{ field: "role", value: debouncedRoleTerm, matchMode: "contains" }]
          : []),
        ...(debouncedStatusTerm
          ? [{ field: "isActive", value: debouncedStatusTerm === "true", matchMode: "equals" }]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        multiSorts: [{
          field: (sortOption || 'name-asc').startsWith('name') ? 'role' : (sortOption || 'name-asc').startsWith('updatedAt') ? 'updatedAt' : 'createdAt',
          order: (sortOption || 'name-asc').endsWith('-desc') ? '-1' : '1',
        }],
      };

      if (canViewRole) {
        const result = await loadRoles(params);
        if (result && Array.isArray(result.data)) {
          setTotalRecords(result.total || result.data.length);
          const transformedRoles = result.data.map((role: any) => ({
            id: role.id,
            role: role.role || "",
            companyId: role.companyId || "",
            group: role.group || "",
            active_status: role.isActive || false,
            createdAt: role.createdAt || role.created_at || "",
            updatedAt: role.updatedAt || role.updated_at || "",
            createdBy: role.createdBy || role.created_by || "",
            updatedBy: role.updatedBy || role.updated_by || "",
          }));
          setRoles(transformedRoles);
        } else {
          toast.error("Failed to fetch roles");
          setRoles([]);
          setTotalRecords(0);
        }
      } else {
        toast.error("Not authorized to view roles");
        setRoles([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.error("Failed to fetch roles");
    } finally {
      setAllRolesGetIsLoading(false);
    }
  };

  const handleRoleClick = (roleId: number, roleName: string) => {
    setSelectedRole(roleId);
    setSelectedRoleName(roleName);
    setOpenViewDialog(true);
    setBreadcrumbs([
      { label: "Roles", href: "/environment/roles" },
      { label: roleName, isCurrentPage: true },
    ]);
  };

  const handleCloseRoleView = () => {
    setOpenViewDialog(false);
    setSelectedRole(null);
    setSelectedRoleName("");
    setBreadcrumbs([{ label: "Roles", href: "/environment/roles", isCurrentPage: true }]);
  };

  const handleRoleEditClick = async (roleId: number) => {
    setAllRolesGetIsLoading(true);
    if (canViewRole) {
      const role = await getRoleById(roleId);
      if (role.status === 200) {
        setEditRole(role.data);
        setOpenEditDialog(true);
        setBreadcrumbs([
          { label: "Roles", href: "/environment/roles" },
          { label: `Edit ${role.data.role}`, isCurrentPage: true },
        ]);
        setAllRolesGetIsLoading(false);
      } else {
        setAllRolesGetIsLoading(false);
        toast.error("Failed to fetch role");
      }
    } else {
      toast.error("Not authorized to edit roles");
      setAllRolesGetIsLoading(false);
    }
  };

  // Debounce effects
  useEffect(() => {
    const t = setTimeout(() => setDebouncedRoleTerm(roleTerm), 500);
    return () => clearTimeout(t);
  }, [roleTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStatusTerm(statusTerm), 500);
    return () => clearTimeout(t);
  }, [statusTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterCompanyId(filterCompanyId), 500);
    return () => clearTimeout(t);
  }, [filterCompanyId]);

  useEffect(() => {
    fetchRoles();
  }, [debouncedRoleTerm, debouncedStatusTerm, debouncedFilterCompanyId, currentPage, itemsPerPage, canViewRole, sortOption]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedRoleTerm, debouncedStatusTerm, debouncedFilterCompanyId]);

  const panelOpen = openViewDialog && selectedRole !== null;

  const panel = panelOpen ? (
    <div className="w-[580px] flex-shrink-0 pt-2 pr-2 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-950 rounded-t-xl border-t border-x border-border/60 relative">
        <div className="px-5 pt-5 pb-6">
          <RoleView
            open={openViewDialog}
            onOpenChange={(open) => { if (!open) handleCloseRoleView(); }}
            roleId={selectedRole!}
            roleName={selectedRoleName}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden pt-8">
        <RoleList
          roles={roles}
          onRoleClick={handleRoleClick}
          searchTerm={roleTerm}
          onRoleSearchChange={setRoleTerm}
          statusTerm={statusTerm}
          onStatusSearchChange={setStatusTerm}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalRecords={totalRecords}
          useServerPagination={true}
          onRoleUpdate={fetchRoles}
          onRoleEditClick={handleRoleEditClick}
          isLoading={allRolesGetIsLoading}
          onRoleCreateClick={() => setOpenCreateRoleDialog(true)}
          selectedRole={selectedRole || undefined}
          isSystemUser={isSystemUser}
          companies={allCompanies}
          onCompanySearchChange={setFilterCompanyId}
          companyTerm={filterCompanyId}
          sortOption={sortOption}
          onSortChange={(opt) => setSortOption(opt as SortOption)}
          panel={panel}
          panelOpen={panelOpen}
        />
      </div>

      {openCreateRoleDialog && (
        <RoleCreateDrawer
          open={openCreateRoleDialog}
          onOpenChange={setOpenCreateRoleDialog}
          isSystemUser={isSystemUser}
          companies={allCompanies}
          defaultCompanyId={filterCompanyId}
          onSubmit={() => {
            setOpenCreateRoleDialog(false);
            fetchRoles();
          }}
        />
      )}

      {openEditDialog && (
        <RoleEditDrawer
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
          role={editRole || undefined}
          isSystemUser={isSystemUser}
          defaultCompanyId={filterCompanyId}
          onSubmit={() => {
            setOpenEditDialog(false);
            setEditRole(null);
            setBreadcrumbs([{ label: "Roles", href: "/environment/roles", isCurrentPage: true }]);
            fetchRoles();
          }}
        />
      )}
    </>
  );
}

export default Page;
