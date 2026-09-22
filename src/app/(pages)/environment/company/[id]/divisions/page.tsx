"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { toast } from "sonner";
import { loadDivisions } from "@/services/division-services";
import { getCompanyById } from "@/services/company-services";
import { Division } from "@/interfaces/division";
import DivisionList from "./components/division-list";
import DivisionCreateDrawer from "../../components/division_create_drawer";
import DivisionEditDrawer from "../../components/division_edit_drawer";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { safeParse } from "@/services/auth-service";

function Page() {
  const params = useParams<{ id: string }>();
  const { setBreadcrumbs } = useBreadcrumb();

  const companyId = parseInt(params?.id || "0", 10);

  const [companyName, setCompanyName] = useState<string>("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [nameTerm, setNameTerm] = useState("");
  const [statusTerm, setStatusTerm] = useState("");
  const [debouncedNameTerm, setDebouncedNameTerm] = useState("");
  const [debouncedStatusTerm, setDebouncedStatusTerm] = useState("");

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editDivision, setEditDivision] = useState<Division | null>(null);

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

  // Fetch company name for breadcrumb / header.
  // Try localStorage first to avoid an authorized-only API call (prevents
  // 403 -> auto-logout for company users without canViewCompany privilege).
  useEffect(() => {
    if (!companyId) return;

    const activeCompany = safeParse(localStorage.getItem("active_company"));
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];

    const findInLocal = () => {
      if (activeCompany && (activeCompany.companyId === companyId || activeCompany.id === companyId)) {
        return activeCompany.company || activeCompany.name || "";
      }
      const match = Array.isArray(localCompanies)
        ? localCompanies.find((c: any) => c?.companyId === companyId || c?.id === companyId)
        : null;
      return match?.company || match?.name || "";
    };

    const localName = findInLocal();
    if (localName) {
      setCompanyName(localName);
      return;
    }

    // Only call the API if user has canViewCompany privilege (avoids 403 logout)
    if (!canViewCompany) return;

    const loadCompany = async () => {
      try {
        const res = await getCompanyById(companyId);
        if (res.status === 200) {
          setCompanyName(res.data?.company || "");
        }
      } catch {
        // ignore
      }
    };
    loadCompany();
  }, [companyId, canViewCompany]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Company", href: "/environment/company" },
      { label: companyName || "Divisions" },
    ]);
  }, [setBreadcrumbs, companyName]);

  const fetchDivisions = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const filters = [
        { field: "companyId", value: companyId, matchMode: "equals" },
        ...(debouncedNameTerm
          ? [{ field: "division", value: debouncedNameTerm, matchMode: "contains" }]
          : []),
        ...(debouncedStatusTerm
          ? [
              {
                field: "isActive",
                value: debouncedStatusTerm === "true",
                matchMode: "equals",
              },
            ]
          : []),
      ];

      const params = {
        first: (currentPage - 1) * itemsPerPage,
        rows: itemsPerPage,
        filters,
        multiSorts: [
          {
            field: (sortOption || "name-asc").startsWith("name")
              ? "division"
              : (sortOption || "name-asc").startsWith("updatedAt")
              ? "updatedAt"
              : "createdAt",
            order: (sortOption || "name-asc").endsWith("-desc") ? "-1" : "1",
          },
        ],
      };

      const result = await loadDivisions(params);
      if (result && Array.isArray(result.data)) {
        setTotalRecords(result.total || result.data.length);
        setDivisions(result.data);
      } else {
        setDivisions([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching divisions:", error);
      toast.error("Failed to fetch divisions");
    } finally {
      setIsLoading(false);
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
    fetchDivisions();
  }, [
    companyId,
    debouncedNameTerm,
    debouncedStatusTerm,
    currentPage,
    itemsPerPage,
    sortOption,
  ]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedNameTerm, debouncedStatusTerm]);

  const handleDivisionEditClick = (division: Division) => {
    setEditDivision(division);
    setOpenEditDialog(true);
  };

  return (
    <>
      <div className="flex h-full overflow-hidden pt-8">
        <div className="flex flex-col min-h-0 w-full transition-all duration-300 ease-in-out">
          <DivisionList
            divisions={divisions}
            onDivisionEditClick={handleDivisionEditClick}
            searchTerm={nameTerm}
            onDivisionSearchChange={setNameTerm}
            statusTerm={statusTerm}
            onStatusSearchChange={setStatusTerm}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalRecords={totalRecords}
            useServerPagination={true}
            onDivisionUpdate={fetchDivisions}
            isLoading={isLoading}
            onDivisionCreateClick={() => setOpenCreateDialog(true)}
            sortOption={sortOption}
            onSortChange={(opt) => setSortOption(opt as SortOption)}
          />
        </div>
      </div>

      {openCreateDialog && (
        <DivisionCreateDrawer
          open={openCreateDialog}
          onOpenChange={setOpenCreateDialog}
          companyId={companyId}
          onSubmit={() => {
            setOpenCreateDialog(false);
            fetchDivisions();
          }}
        />
      )}

      {openEditDialog && editDivision && (
        <DivisionEditDrawer
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
          companyId={companyId}
          division={editDivision}
          onSubmit={() => {
            setOpenEditDialog(false);
            setEditDivision(null);
            fetchDivisions();
          }}
        />
      )}
    </>
  );
}

export default Page;
