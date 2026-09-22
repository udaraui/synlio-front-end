'use client';

import Info_button from '@/components/Info_button';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Building2, Pencil, PersonStanding, Users, Mail, Tag } from 'lucide-react';
import React from 'react';

// --- INTERFACES ---

interface ResourcePool {
  resource_pool_id: number;
  resource_pool_name: string;
  resource_pool_status: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  isActive?: boolean;
  company_id: number;
  company_name: string;
  company_code: string;
  division_id: number;
  division_name: string;
  division_code: string;
  pool_owner_id: number | null;
  pool_owner_first_name: string | null;
  pool_owner_last_name: string | null;
  pool_owner_email: string | null;
  pool_owner_mobile: string | null;
  resources?:
    | {
    resourceId: number;
    firstName: string;
    lastName: string;
    email: string;
    divisionId: number;
    active: boolean;
  }[]
    | null;
}

export function ResourcePoolListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="group relative border-y border-r border-l-2 border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 border-l-gray-200/60 rounded-xl bg-background shadow-sm dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 dark:border-l-gray-700/60 overflow-hidden"
        >
          <div className="p-3 pl-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 min-w-[300px] max-w-[350px] flex-shrink-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-14 rounded" />
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex items-center gap-4 flex-shrink-0 min-w-[200px] max-w-[350px]">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-24 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ListViewProps {
  resourcePools: ResourcePool[];
  onResourcePoolClick: (resourcePoolId: number) => void;
  isLoading: boolean;
  onEditResourcePool: (resourcePoolId: number) => void;
}

// --- LISTVIEW COMPONENT ---

const ListView: React.FC<ListViewProps> = ({
                                             resourcePools,
                                             onResourcePoolClick,
                                             isLoading,
                                             onEditResourcePool,
                                           }) => {
  // 1. Loading State
  if (isLoading) {
    return <ResourcePoolListSkeleton count={6} />;
  }

  if (resourcePools.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No resource group found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resourcePools.map((resourcePool) => {

        // Status Bar Color Logic
        const isActive = resourcePool.isActive;
        const statusAccentColor = isActive ? 'bg-green-500/80' : 'bg-red-500/80';
        const statusText = isActive ? 'Active' : 'Inactive';

        const resources = resourcePool.resources ?? [];
        const resourceCount = resources.length;
        const poolOwnerName = resourcePool.pool_owner_first_name
          ? `${resourcePool.pool_owner_first_name} ${resourcePool.pool_owner_last_name}`
          : 'N/A';

        return (
          <div
            key={resourcePool.resource_pool_id}
            onClick={() => onResourcePoolClick(resourcePool.resource_pool_id)}
            className={`group relative border-y border-r border-l-2 ${isActive ? 'border-l-green-500/80' : 'border-l-red-500/80'} border-t-gray-200/60 border-b-gray-200/60 border-r-gray-200/60 rounded-xl bg-white shadow-sm transition-all duration-300 dark:bg-gray-900/50 dark:border-t-gray-700/60 dark:border-b-gray-700/60 dark:border-r-gray-700/60 overflow-hidden cursor-pointer
              hover:shadow-lg hover:border-blue-400/60 dark:hover:border-blue-500/60 
            `}
          >

            <div className="p-3 pl-4"> {/* Inner padding adjusted */}
              <div className="flex items-center  gap-4"> {/* Main content flex */}

                {/* 2. Pool Name (Min Width/Prefix Section Equivalent) */}
                <div className="flex items-center gap-3 min-w-[300px] max-w-[350px] flex-shrink-0">
                  <h3
                    className={`text-sm font-semibold text-gray-900 dark:text-gray-50 truncate transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400`}
                    title={resourcePool.resource_pool_name}
                  >
                    {resourcePool.resource_pool_name.toUpperCase()}
                  </h3>
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                      isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-300 dark:border-green-600'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-600'
                    }`}
                    >
                    {statusText}
                    </span>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

                {/* 4. Pool Owner & Resource Count (Tags Equivalent) */}
                <div className="flex items-center gap-4 flex-shrink-0 min-w-[200px] max-w-[350px]">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate"
                       title={poolOwnerName}>
                      <PersonStanding className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="font-medium">Owner:</span>
                      <span className="truncate">{poolOwnerName}</span>
                    </p>
                    {resourcePool.pool_owner_email && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate">
                        <Mail className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        <span className="truncate">{resourcePool.pool_owner_email}</span>
                      </p>
                    )}
                  </div>

                  {/* Resource Count Chip */}
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-600 flex-shrink-0">
                        <Users className="w-3.5 h-3.5" />
                        <span>{resourceCount}</span>
                        <span>Resources</span>
                    </span>
                </div>

                {/* Quick Actions - End of Card */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResourcePoolClick(resourcePool.resource_pool_id);
                    }}
                    title="View Details"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditResourcePool(resourcePool.resource_pool_id);
                    }}
                    title="Edit Resource Group"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium h-7 px-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Implement resource assignment logic here
                    }}
                  >
                    Manage Resources
                  </Button>
                  <Info_button
                    id={resourcePool.resource_pool_id}
                    createdBy={resourcePool.createdBy ?? ''}
                    createdAt={resourcePool.createdAt}
                    updatedBy={resourcePool.updatedBy ?? ''}
                    updatedAt={resourcePool.updatedAt}
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
