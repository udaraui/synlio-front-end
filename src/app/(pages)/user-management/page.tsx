"use client";
import { useState, useEffect } from "react";
import UserCreateDrawer from "./components/user-create-drawer";
import UserList from "./components/user-list";
import { getUserById, load } from "@/services/user-service";
import { toast } from "sonner";
import { User } from "@/interfaces/user";
import UserView from "./components/user-view";
import UserEditDrawer from "./components/user-edit-drawer";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { getAllCompany } from "@/services/company-services";
import { safeParse } from "@/services/auth-service";

const Page = () => {
  const { setBreadcrumbs } = useBreadcrumb();
  const [isLoading, setIsLoading] = useState(true);
  const [allUsersGetIsLoading, setAllUsersGetIsLoading] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [nameTerm, setNameTerm] = useState("");
  const [statusTerm, setStatusTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [openEditDrawer, setOpenEditDrawer] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [debouncedNameTerm, setDebouncedNameTerm] = useState("");
  const [debouncedStatusTerm, setDebouncedStatusTerm] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const [debouncedFilterCompanyId, setDebouncedFilterCompanyId] = useState("");
  type SortOption = 'name-asc' | 'name-desc' | 'updatedAt-desc' | 'updatedAt-asc' | 'createdAt-desc' | 'createdAt-asc' | '';
  const [sortOption, setSortOption] = useState<SortOption>('');
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [isSystemUser, setIsSystemUser] = useState(false);

  const canViewUser = usePrivilegeGuard("16") as boolean;

  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    setIsSystemUser(localCompanies.length === 0);
  }, []);

  useEffect(() => {
    setBreadcrumbs([
      {
        label: "User",
        href: "/user-management",
        isCurrentPage: true,
      },
    ]);
  }, [setBreadcrumbs]);

  const fetchUsers = async () => {
    setAllUsersGetIsLoading(true);
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    const selectedCompany = safeParse(localStorage.getItem("active_company"));
    const isSystem = localCompanies.length === 0;

    try {
      const filters = [
        ...(!isSystem && selectedCompany?.companyId
          ? [{ field: "companyId", value: selectedCompany.companyId, matchMode: "equals" }]
          : []),
        ...(isSystem && debouncedFilterCompanyId
          ? [{ field: "companyId", value: parseInt(debouncedFilterCompanyId), matchMode: "equals" }]
          : []),
        ...(debouncedNameTerm
          ? [{ field: debouncedNameTerm.includes("@") ? "email" : "first_name", value: debouncedNameTerm, matchMode: "contains" }]
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
          field: (sortOption || 'name-asc').startsWith('name') ? 'first_name' : (sortOption || 'name-asc').startsWith('updatedAt') ? 'updatedAt' : 'createdAt',
          order: (sortOption || 'name-asc').endsWith('-desc') ? '-1' : '1',
        }],
      };

      if (canViewUser) {
        const result = await load(params);
        if (result && Array.isArray(result.data)) {
          setTotalRecords(result.total || result.data.length);
          const transformedUsers = result.data.map((user: any) => ({
            id: user.id,
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            mobile_number: user.mobile_number || "",
            isActive: user.isActive,
            createdAt: user.createdAt || user.created_at || new Date().toISOString(),
            updatedAt: user.updatedAt || user.updated_at || "",
            createdBy: user.createdBy || user.created_by || "",
            updatedBy: user.updatedBy || user.updated_by || "",
            profile_picture: user.profile_picture || "",
            userCompanyRoles: user.userCompanyRoles || [],
            divisions: user.divisions || [],
          }));
          setUsers(transformedUsers);
        } else {
          toast.error("Failed to fetch users");
          setUsers([]);
          setTotalRecords(0);
        }
      } else {
        toast.error("Not authorized to view users");
        setUsers([]);
        setTotalRecords(0);
        return;
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setAllUsersGetIsLoading(false);
    }
  };

  const handleUserClick = async (userId: number) => {
    setIsLoading(true);
    const user = await getUserById(userId);
    if (user.status === 200) {
      setSelectedUser(user.data);
      setOpenViewDialog(true);
      setBreadcrumbs([
        { label: "User Management", href: "/user-management" },
        { label: `${user.data.first_name} ${user.data.last_name}`, isCurrentPage: true },
      ]);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      toast.error("Failed to get user");
    }
  };

  const handleCloseUserView = () => {
    setOpenViewDialog(false);
    setSelectedUser(null);
    setBreadcrumbs([
      { label: "User Management", href: "/user-management", isCurrentPage: true },
    ]);
  };

  const handleCloseUserEdit = (open: boolean) => {
    setOpenEditDrawer(open);
    if (!open) {
      setBreadcrumbs([
        { label: "User Management", href: "/user-management", isCurrentPage: true },
      ]);
    }
  };

  const handleUserEditClick = async (userId: number) => {
    setIsLoading(true);
    const user = await getUserById(userId);
    if (user.status === 200) {
      setEditUser(user.data);
      setOpenEditDrawer(true);
      setBreadcrumbs([
        { label: "User Management", href: "/user-management" },
        { label: `Edit ${user.data.first_name} ${user.data.last_name}`, isCurrentPage: true },
      ]);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      toast.error("Failed to get user");
    }
  };

  // Debounce effects
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNameTerm(nameTerm), 500);
    return () => clearTimeout(t);
  }, [nameTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStatusTerm(statusTerm), 500);
    return () => clearTimeout(t);
  }, [statusTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterCompanyId(filterCompanyId), 500);
    return () => clearTimeout(t);
  }, [filterCompanyId]);

  useEffect(() => {
    if (isSystemUser) {
      const fetchCompanies = async () => {
        try {
          const result = await getAllCompany();
          const companiesList = result.data || [];
          setAllCompanies(companiesList);
        } catch (error) {
          console.error("Failed to fetch companies:", error);
        }
      };
      fetchCompanies();
    }
  }, [isSystemUser]);

  useEffect(() => {
    fetchUsers();
  }, [
    debouncedNameTerm,
    debouncedStatusTerm,
    debouncedFilterCompanyId,
    currentPage,
    itemsPerPage,
    canViewUser,
    sortOption,
  ]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedNameTerm, debouncedStatusTerm, debouncedFilterCompanyId]);

  const panelOpen = openViewDialog && selectedUser !== null;

  const panel = panelOpen ? (
    <div className="w-[460px] flex-shrink-0 pt-2 pr-2 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-950 rounded-xl border border-border/60 relative">
        <div className="px-5 pt-5 pb-6">
        <UserView
          open={openViewDialog}
          onOpenChange={(open) => {
            if (!open) handleCloseUserView();
          }}
          user={selectedUser!}
          isLoading={isLoading}
          isSystemUser={isSystemUser}
          filterCompanyId={filterCompanyId}
        />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden pt-8">
        <UserList
          users={users}
          onUserClick={handleUserClick}
          searchTerm={nameTerm}
          onNameSearchChange={setNameTerm}
          statusTerm={statusTerm}
          onStatusSearchChange={setStatusTerm}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalRecords={totalRecords}
          useServerPagination={true}
          onUserUpdate={fetchUsers}
          onUserEditClick={handleUserEditClick}
          isLoading={allUsersGetIsLoading}
          onUserCreateDrawerClick={() => setOpenCreateDialog(true)}
          selectedUser={selectedUser}
          isSystemUser={isSystemUser}
          companies={allCompanies}
          onCompanySearchChange={setFilterCompanyId}
          companyTerm={filterCompanyId}
          sortOption={sortOption}
          onSortChange={(opt) => setSortOption(opt as any)}
          panel={panel}
          panelOpen={panelOpen}
        />
      </div>

      {openCreateDialog && (
        <UserCreateDrawer
          open={openCreateDialog}
          onOpenChange={setOpenCreateDialog}
          defaultCompanyId={filterCompanyId}
          onSubmit={async () => {
            await fetchUsers();
          }}
        />
      )}

      {openEditDrawer && (
        <UserEditDrawer
          open={openEditDrawer}
          onOpenChange={handleCloseUserEdit}
          user={editUser || undefined}
          defaultCompanyId={filterCompanyId}
          onSubmit={() => {
            setOpenEditDrawer(false);
            setEditUser(null);
            setBreadcrumbs([
              { label: "User Management", href: "/user-management", isCurrentPage: true },
            ]);
            fetchUsers();
          }}
        />
      )}
    </>
  );
};

export default Page;
