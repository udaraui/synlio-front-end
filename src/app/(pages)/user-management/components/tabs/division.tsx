import React from "react";
import { User } from "@/interfaces/user";

function Divisions({
  user,
  isSystemUser,
  filterCompanyId,
}: {
  user: User;
  isSystemUser?: boolean;
  filterCompanyId?: string;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredDivisions = React.useMemo(() => {
    if (!user.divisions) return [];

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

    if (targetCompanyId) {
      return user.divisions.filter(
        (d) => d.companyId === targetCompanyId || (d.company && d.company.id === targetCompanyId)
      );
    }
    return user.divisions;
  }, [user.divisions, isSystemUser, filterCompanyId]);

  return (
    <div className="px-2">
      {filteredDivisions && filteredDivisions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filteredDivisions.map((division) => (
            <span
              key={division.id}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground border border-border/60"
            >
              {division.division}
            </span>
          ))}
        </div>
      ) : (
        <p className="italic text-sm text-muted-foreground py-2">No divisions assigned</p>
      )}
    </div>
  );
}

export default Divisions;
