"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { getCompanyById, load } from "@/services/company-management/company-services";
import { toast } from "sonner";
import CompanyList from "./components/company-list";
import CompanyCreateDrawer from "./components/company_create_drawer";
import CompanyEditDrawer from "./components/company_edit_drawer";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { safeParse } from "@/services/auth/auth-service";
import { Company } from "@/interfaces/company";

function Page() {
  const router = useRouter();
  const { setBreadcrumbs } = useBreadcrumb();

  const [companyIsLoading, setCompanyIsLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [nameTerm, setNameTerm] = useState("");
  const [statusTerm, setStatusTerm] = useState("");
  const [debouncedNameTerm, setDebouncedNameTerm] = useState("");
  const [debouncedStatusTerm, setDebouncedStatusTerm] = useState("");

  const [openCreateCompanyDialog, setOpenCreateCompanyDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);

  const [isSystemUser, setIsSystemUser] = useState(false);

  type SortOption =
    | "name-asc"
    | "name-desc"
    | "updatedAt-desc"
    | "updatedAt-asc"
    | "createdAt-desc"
    | "createdAt-asc"
    | "";
  const [sortOption, setSortOption] = useState<SortOption>("");

  const canViewCompany = usePrivilegeGuard("4") as boolean;
  const canEditCompany = usePrivilegeGuard("2") as boolean;

  useEffect(() => {
    setBreadcrumbs([
      { label: "Company", href: "/environment/company", isCurrentPage: true },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    setIsSystemUser(localCompanies.length === 0);
  }, []);

  const fetchCompanies = async () => {
    const user = safeParse(localStorage.getItem("user"));
    if (!user) return;

    setCompanyIsLoading(true);
    try {
      const filters = [
        ...(debouncedNameTerm
          ? [{ field: "company", value: debouncedNameTerm, matchMode: "contains" }]
          : []),
        ...(debouncedStatusTerm
          ? [{ field: "isActive", value: debouncedStatusTerm, matchMode: "equals" }]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        multiSorts: [
          {
            field: (sortOption || "name-asc").startsWith("name")
              ? "company"
              : (sortOption || "name-asc").startsWith("updatedAt")
                ? "updatedAt"
                : "createdAt",
            order: (sortOption || "name-asc").endsWith("-desc") ? "-1" : "1",
          },
        ],
      };

      const transformCompany = (company: any) => ({
        id: company.id || company.companyId || 0,
        company: company.company || "",
        company_code: company.company_code || "",
        active_status: company.isActive,
        logo: company.logo || "",
        suspend_on: company.suspend_on,
        notificationEmail: company.notificationEmail,
        emailProvider: company.emailProvider,
        weekEndDay: company.weekEndDay,
        createdAt: company.createdAt || undefined,
        updatedAt: company.updatedAt || undefined,
        createdBy: company.created_by || "",
        updatedBy: company.updated_by || "",
      });

      // Priority 1: System users always fetch all
      if (isSystemUser) {
        const result = await load(params);
        if (result && Array.isArray(result.data)) {
          setTotalRecords(result.total || result.data.length);
          setCompanies(result.data.map(transformCompany));
          return;
        }
      }

      // Priority 2: Users with view privilege fetch all (backend filters by row-level security)
      if (canViewCompany) {
        const result = await load(params);
        if (result && Array.isArray(result.data)) {
          setTotalRecords(result.total || result.data.length);
          setCompanies(result.data.map(transformCompany));
        } else {
          setCompanies([]);
          setTotalRecords(0);
        }
      } else {
        // Priority 3: Fallback to local active company
        const activeCompany = safeParse(localStorage.getItem("active_company"));
        const localCos = safeParse(localStorage.getItem("companies")) || [];

        let targetCompany = activeCompany;
        if ((!targetCompany || targetCompany === 0) && localCos.length > 0) {
          targetCompany = localCos[0];
        }

        if (targetCompany && typeof targetCompany === "object") {
          const companyData: any = {
            id: targetCompany.id || targetCompany.companyId || 0,
            company: targetCompany.company || targetCompany.name || "My Company",
            company_code: targetCompany.company_code || targetCompany.code || "N/A",
            active_status:
              targetCompany.isActive !== undefined
                ? targetCompany.isActive
                  ? "active"
                  : "block"
                : "active",
            logo: targetCompany.logo || "",
            weekEndDay: targetCompany.weekEndDay,
            createdAt: undefined,
            updatedAt: undefined,
            createdBy: "",
            updatedBy: "",
          };
          setCompanies([companyData]);
          setTotalRecords(1);
        } else {
          setCompanies([]);
          setTotalRecords(0);
        }
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Failed to fetch companies");
    } finally {
      setCompanyIsLoading(false);
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
    fetchCompanies();
  }, [
    debouncedNameTerm,
    debouncedStatusTerm,
    currentPage,
    itemsPerPage,
    canViewCompany,
    isSystemUser,
    sortOption,
  ]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedNameTerm, debouncedStatusTerm]);

  const handleCompanyClick = (companyId: number, companyName: string) => {
    router.push(`/environment/company/${companyId}/divisions`);
  };

  const handleCompanyEditClick = async (companyId: number) => {
    setCompanyIsLoading(true);
    if (canEditCompany) {
      try {
        const company = await getCompanyById(companyId);
        if (company.status === 200) {
          setEditCompany(company.data);
          setOpenEditDialog(true);
        } else {
          toast.error("Failed to fetch company");
        }
      } catch {
        toast.error("Failed to fetch company");
      } finally {
        setCompanyIsLoading(false);
      }
    } else {
      toast.error("Not authorized to edit companies");
      setCompanyIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex h-full overflow-hidden pt-8">
        <div className="flex flex-col min-h-0 w-full transition-all duration-300 ease-in-out">
          <CompanyList
            companies={companies}
            onCompanyClick={handleCompanyClick}
            searchTerm={nameTerm}
            onCompanySearchChange={setNameTerm}
            statusTerm={statusTerm}
            onStatusSearchChange={setStatusTerm}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalRecords={totalRecords}
            useServerPagination={true}
            onCompanyUpdate={fetchCompanies}
            onCompanyEditClick={handleCompanyEditClick}
            isLoading={companyIsLoading}
            onCompanyCreateClick={() => setOpenCreateCompanyDialog(true)}
            isSystemUser={isSystemUser}
            sortOption={sortOption}
            onSortChange={(opt) => setSortOption(opt as SortOption)}
          />
        </div>
      </div>

      {openCreateCompanyDialog && (
        <CompanyCreateDrawer
          open={openCreateCompanyDialog}
          onOpenChange={setOpenCreateCompanyDialog}
          onCompanyUpdate={fetchCompanies}
          onSubmit={() => {
            setOpenCreateCompanyDialog(false);
            fetchCompanies();
          }}
        />
      )}

      {openEditDialog && (
        <CompanyEditDrawer
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
          company={editCompany || undefined}
          onCompanyUpdate={fetchCompanies}
          onSubmit={() => {
            setOpenEditDialog(false);
            setEditCompany(null);
            setBreadcrumbs([
              { label: "Company", href: "/environment/company", isCurrentPage: true },
            ]);
            fetchCompanies();
          }}
        />
      )}
    </>
  );
}

export default Page;
