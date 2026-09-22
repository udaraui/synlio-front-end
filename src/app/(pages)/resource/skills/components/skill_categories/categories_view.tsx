import React from "react";
import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";
import { MailIcon, PhoneIcon, XIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { SkillCategory } from "@/interfaces/skill";
import Info_button from "@/components/Info_button";
import Skill_list from "../skills/skill_list";
import Skill_level_list from "../skill_levels/skill_level_list";

interface UserViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillCategory: SkillCategory;
  isLoading: boolean;
}

const UserView: React.FC<UserViewProps> = ({
  open,
  onOpenChange,
  skillCategory,
  isLoading,
}) => {
  if (!open) return null;
  const canViewSkillCategory = usePrivilegeGuard("17") as boolean;

  // Full loading state when no user data is available yet
  if (isLoading && !skillCategory) {
    return (
      <div className="animate-pulse">
        <div className="sticky top-0 pb-3 flex justify-between items-center">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-sm" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex items-center gap-1">
                  <MailIcon className="h-3 w-3" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0"
          >
            <XIcon />
          </button>
        </div>

        <div className="w-full space-y-4">
          <div className="w-full grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 pb-3 flex justify-between items-center">
        {canViewSkillCategory ? (
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-sm" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <h1 className="text-lg tracking-tight">
                      {skillCategory.name}
                    </h1>
                    <span
                      className={`inline-block px-2  py-0.5 rounded-sm text-xs h-fit ${
                        skillCategory.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {skillCategory.isActive ? "Active" : "Inactive"}
                    </span>
                    <Info_button
                      id={skillCategory.id}
                      createdBy={skillCategory.createdBy || ""}
                      createdAt={skillCategory.createdAt || new Date()}
                      updatedBy={skillCategory.updatedBy || ""}
                      updatedAt={skillCategory.updatedAt || new Date()}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {skillCategory.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-red-500">
            You are not authorized to view skill categories
          </div>
        )}
        <button
          onClick={() => onOpenChange(false)}
          className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0"
        >
          <XIcon />
        </button>
      </div>
      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="w-full grid grid-cols-2 gap-0 mx-0  h-auto">
          <TabsTrigger
            value="skills"
            className="text-xs sm:text-sm sm:px-3 py-1 sm:py-2 w-full"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="truncate">Skills</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="skills_levels"
            className="text-xs sm:text-sm  sm:px-3 py-1 sm:py-2 w-full"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="truncate">Skills Levels</span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="skills">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <Skill_list skillCategoryId={skillCategory.id} />
          )}
        </TabsContent>
        <TabsContent value="skills_levels">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <Skill_level_list skillCategoryId={skillCategory.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserView;
