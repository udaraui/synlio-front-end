'use client';

import React from 'react';
import { SkeletonLoadinWithoutImage } from '@/components/loading/GeneralSkeletons';
import Info_button from '@/components/Info_button';
import { RefreshCw, Pencil, Mail, Phone, Tag, Briefcase, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- Hardcoded Data & Helpers ---

// Define a set of utilization percentages to cycle through
const hardcodedUtilizations = [80, 25, 55, 95, 40, 75, 10, 60, 35, 90];
// Define a set of hardcoded project counts to cycle through

// Function to determine the utilization bar's color classes and text (using muted colors)
const getUtilizationInfo = (percent: any) => {
  let gradientClasses = '';
  let colorText = '';

  if (percent <= 40) {
    // Muted/Neutral (Slate/Blue-Gray) for Low
    gradientClasses = 'from-slate-500 to-slate-400';
    colorText = 'text-slate-600 dark:text-slate-400';
  } else if (percent <= 70) {
    // Muted Warm (Amber/Orange) for Medium
    gradientClasses = 'from-amber-300 to-amber-200';
    colorText = 'text-amber-600 dark:text-amber-400';
  } else {
    // Softer Red/Rose for High
    gradientClasses = 'from-red-300 to-red-200'; // Using slightly higher saturation/darker shade for impact
    colorText = 'text-red-400 dark:text-red-300';
  }

  return { gradientClasses, colorText };
};


// --- Interfaces (Kept as provided) ---

interface Resource {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic: string;
  active_status: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  division?: {
    id: number;
    division: string;
  };
  calendar?: {
    id: number;
    name: string;
  };
  skills?: {
    id: number;
    skillName: string;
    skillLevelName: string;
    starCount: number;
    skillCategoryName: string;
    companyId: number;
    createdAt: string;
    updatedAt: string;
  }[];
}

interface ListViewProps {
  resources: Resource[];
  onResourceClick: (resourceId: number) => void;
  isLoading: boolean;
  individualSkillLoading: { [key: number]: boolean };
  onRefreshSkills: (resourceId: number) => void;
  onEditResource: (resourceId: number) => void;
}

// --- Component ---

const ListView: React.FC<ListViewProps> = ({
                                             resources,
                                             onResourceClick,
                                             isLoading,
                                             onRefreshSkills,
                                             onEditResource,
                                           }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <SkeletonLoadinWithoutImage />
        <SkeletonLoadinWithoutImage />
      </div>
    );
  }

  return (
    <div className="space-y-3"> {/* Changed from grid to space-y-3 */}
      {resources.map((resource, index) => {
        const fullName = `${resource.first_name} ${resource.last_name}`;
        const initials = `${resource.first_name?.[0] || ""}${resource.last_name?.[0] || ""}`.toUpperCase();

        // Status Bar Color Logic
        const statusAccentColor = resource.active_status ? 'bg-green-500/80' : 'bg-red-500/80';

        // Dynamic Hardcoded Metrics
        const utilizationPercent = hardcodedUtilizations[index % hardcodedUtilizations.length];
        const utilizationInfo = getUtilizationInfo(utilizationPercent);
        const widthStyle = { width: `${utilizationPercent}%` };

        return (
          <div
            key={resource.id}
            onClick={() => onResourceClick(resource.id)}
            className={`group relative border-y border-r border-l-2 ${resource.active_status ? 'border-l-green-500/80' : 'border-l-red-500/80'} border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 rounded-xl bg-white shadow-sm transition-all duration-300 dark:bg-gray-800 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 overflow-hidden cursor-pointer
              hover:shadow-lg hover:border-blue-400/60 dark:hover:border-blue-500/60 
            `}
          >

            <div className="p-3 pl-4"> {/* Inner padding adjusted to match Project Group style */}
              <div className="flex items-center gap-4"> {/* Main content flex */}

                {/* 2. Resource Core Info (Flex-1) */}
                <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[400px]">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0 bg-primary flex items-center justify-center">
                    {resource.profile_pic && resource.profile_pic.length > 0 ? (
                      <img
                        src={resource.profile_pic}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white dark:text-black leading-none mt-[1px]">
                        {initials}
                      </span>
                    )}
                  </div>
                  {/* Name & Contact */}
                  <div className="space-y-0.5 min-w-0">
                    <h4
                      className={`text-sm font-semibold text-gray-900 dark:text-gray-50 truncate transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400`}
                      title={fullName}
                    >
                      {fullName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="truncate">{resource.email}</span>
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

                {/* 3. Division & Calendar (Flex-shrink-0) */}
                <div className="flex-shrink-0 min-w-[200px] max-w-[300px] space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate">
                    <span className="font-medium">Division:</span>
                    <span className="truncate">{resource.division?.division || "N/A"}</span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate">
                    <span className="font-medium">Calendar:</span>
                    <span className="truncate">{resource.calendar?.name || "N/A"}</span>
                  </p>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

                {/* 4. Skills & Utilization Summary (Vertical Stack) */}
                <div className="flex-shrink-0 min-w-[250px] max-w-[350px] space-y-2">
                  {/* Top Skills Summary */}
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Top Skills:
                        </span>
                    <div className="flex flex-wrap gap-1">
                      {resource.skills && resource.skills.length > 0 ? (
                        resource.skills.slice(0, 2).map((skill, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-black dark:text-black">
                              {skill?.skillName}
                            </span>
                            <span className="text-[9px] text-gray-400 uppercase font-bold">{skill?.skillLevelName}</span>
                            <div className="flex text-yellow-500">
                              {[...Array(5)].map((_, idx) => (
                                <span key={idx} className={idx < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}>★</span>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                  No skills
                                </span>
                      )}
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                            Util:
                        </span>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-300 bg-gradient-to-r ${utilizationInfo.gradientClasses}`}
                        style={widthStyle}
                      ></div>
                    </div>
                    <p className={`text-xs ${utilizationInfo.colorText} font-semibold flex-shrink-0`}>
                      {utilizationPercent}%
                    </p>
                  </div>

                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

                {/* 5. Quick Actions - End of Card */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                  {/* View Details/Click Action Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResourceClick(resource.id);
                    }}
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>

                  {/* Edit Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditResource(resource.id);
                    }}
                    title="Edit Resource"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  {/* Refresh Skills Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-300 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshSkills(resource.id);
                    }}
                    title="Refresh Skills"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>

                  {/* Assignments Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium h-7 px-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Implement assignment logic here
                    }}
                  >
                    Assignments
                  </Button>

                  {/* Info Button (Smallest action) */}
                  <Info_button
                    id={resource.id}
                    createdBy={resource.createdBy}
                    createdAt={resource.createdAt}
                    updatedBy={resource.updatedBy}
                    updatedAt={resource.updatedAt}
                  />

                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListView;

