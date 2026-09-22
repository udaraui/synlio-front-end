import React, { useMemo } from "react";
import { User } from "@/interfaces/user";
import RolesPermissions from "./tabs/roles_permissions";
import { XIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { ProfileImage } from "@/components/common/ProfileImage";

interface UserViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  isLoading: boolean;
  isSystemUser?: boolean;
  filterCompanyId?: string;
}

const UserView: React.FC<UserViewProps> = ({
  open,
  onOpenChange,
  user,
  isLoading,
  isSystemUser,
  filterCompanyId,
}) => {
  const canViewUser = usePrivilegeGuard("16") as boolean;

  const filteredDivisions = useMemo(() => {
    if (!user?.divisions) return [];
    let selectedCompany = null;
    try {
      selectedCompany = JSON.parse(localStorage.getItem("active_company") || "null");
    } catch { }
    const targetCompanyId = isSystemUser
      ? filterCompanyId ? parseInt(filterCompanyId) : null
      : selectedCompany?.companyId;
    if (targetCompanyId) {
      return user.divisions.filter(
        (d) => d.companyId === targetCompanyId || d.company?.id === targetCompanyId
      );
    }
    return user.divisions;
  }, [user?.divisions, isSystemUser, filterCompanyId]);

  if (!open) return null;

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  /* ── Loading skeleton ── */
  if (isLoading && !user) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between items-center pb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  /* ── Main view ── */
  return (
    <div className="space-y-0">
      {/* User header */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-border flex justify-between items-start -mx-5 -mt-5 mb-2">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {canViewUser ? (
            isLoading ? (
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            ) : user.profile_picture ? (
              <ProfileImage
                profileImage={user.profile_picture}
                userName={user.first_name}
                size="md"
              />
            ) : (
              <Avatar className="h-14 w-14 flex-shrink-0 shadow-sm border border-border/50">
                <AvatarImage
                  src={user.profile_picture}
                  alt={`${user.first_name} ${user.last_name}`}
                />
                <AvatarFallback className="text-lg font-semibold bg-primary text-white">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
            )
          ) : (
            <p className="text-sm text-destructive">Not authorized to view users</p>
          )}

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <Skeleton className="h-4 w-32 mb-1" />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {user.first_name} {user.last_name}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${user.isActive ? "bg-green-500" : "bg-red-500"
                    }`} />
                  {user.isActive ? "Active" : "Inactive"}
                </div>
              </div>
            )}

            <div className="mt-1 space-y-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </>
              ) : (
                <>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {[
                      user.email,
                      user.mobile_number,
                      ...(filteredDivisions.length > 0 ? [filteredDivisions.map(d => d.division).join(", ")] : [])
                    ].filter(Boolean).join(" • ")}
                  </p>

                  <p className="text-[12px] text-muted-foreground/80 pt-0.5">
                    Created, {new Date(user.createdAt || new Date()).toLocaleString('en-US', {
                      month: '2-digit', day: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                  </p>
                </>
              )}
            </div>
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

      {/* ── Roles & Permissions section ── */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs text-muted-foreground">
              Roles & Permission
            </p>
            <RolesPermissions
              user={user}
              isSystemUser={isSystemUser}
              filterCompanyId={filterCompanyId}
            />
          </div>

        </>
      )}
    </div>
  );
};

export default UserView;
