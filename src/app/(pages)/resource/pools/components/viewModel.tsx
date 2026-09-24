'use client';

import React, { useEffect, useState } from 'react';
import {
  XIcon,
  Users,
  Building2,
  Maximize2,
  Minimize2,
  MailIcon,
  PhoneIcon,
  Clock,
  UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getById } from '@/services/resource-management/resource-pool-service';
import ResourceCard from '@/components/common/ResourceCard';

// --- Interfaces based on your Data ---
interface Company {
  id: number;
  company: string;
  company_code: string;
}

interface Division {
  id: number;
  division: string;
  division_code: string;
}

interface PoolOwner {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string | null;
  profile_picture: string | null;
  isActive: boolean;
}

interface Resource {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string | null;
  profile_pic: string | null;
  active_status: boolean;
  working_hours: number;
  companyId: number;
  divisionId: number;
}

interface ResourcePoolData {
  id: number;
  name: string;
  isActive: boolean; // Note: Boolean in your data
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  company: Company;
  division: Division;
  pool_owner: PoolOwner;
  resources: Resource[];
}

interface ResourcePoolModalProps {
  open: boolean;
  onClose: () => void;
  id: number | null;
}

// --- Utility Functions ---
const getStatusInfo = (isActive: boolean) => {
  if (isActive) {
    return {
      text: 'Active',
      classes: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      barColor: 'bg-green-500/80',
    };
  }
  return {
    text: 'Inactive',
    classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    barColor: 'bg-red-500/80',
  };
};

// --- Skeleton Loader ---
const ViewModalSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <Skeleton className="h-1.5 w-full" />
    <div className="px-6 py-4 border-b border-border space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// --- Main Component ---
const ResourcePoolViewModal: React.FC<ResourcePoolModalProps> = ({ open, onClose, id }) => {
  if (!open || !id) return null;

  // Assuming you might want a privilege check here too
  // const canView = usePrivilegeGuard('42');
  const canView = true; // Temporary bypass for logic

  const [data, setData] = useState<ResourcePoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!open || !id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getById(id);
        if (response) {
          setData(response.data as unknown as ResourcePoolData);

        } else {
          toast.error('Resource Group not found');
          onClose();
        }
      } catch (error: any) {
        // console.error('Failed to fetch resource group:', error);
        toast.error('Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, open]);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={isFullscreen ? 'w-full h-full' : ''}
      >
        <div
          className={`relative shadow-2xl overflow-hidden bg-white dark:bg-gray-800 border border-border rounded-xl flex flex-col`}
          style={{
            width: isFullscreen ? '100%' : '85vw',
            maxWidth: isFullscreen ? '100%' : '1200px',
            height: isFullscreen ? '100%' : '85vh',
          }}
        >
          {canView ? (
            <>
              {loading ? (
                <ViewModalSkeleton />
              ) : data ? (
                <>
                  {/* Status Bar */}
                  <div className={`h-1 flex-shrink-0 ${getStatusInfo(data.isActive).barColor}`} />

                  {/* Header Section */}
                  <div
                    className="flex-shrink-0 border-b border-border bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 truncate">
                          {data.name}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border text-xs font-medium text-foreground/70 flex-shrink-0">
                          <span
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${data.isActive
                                ? "bg-green-500 dark:bg-green-400"
                                : "bg-red-400 dark:bg-red-500"
                              }`}
                          />
                          {data.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Window Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsFullscreen(!isFullscreen)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                          {isFullscreen ? (
                            <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={onClose}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Close"
                        >
                          <XIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="px-6 pb-4 flex items-center gap-6 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          {data.company?.company}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {data.division?.division}
                        </span>
                      </div>

                      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-400">Owner:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {data.pool_owner?.first_name} {data.pool_owner?.last_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Section */}
                  <Tabs defaultValue="resources" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 border-b border-border bg-white dark:bg-gray-800">
                      <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                        <TabsTrigger
                          value="resources"
                          className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none px-4 h-12 border-b-2 border-transparent"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Resources ({data.resources?.length || 0})
                        </TabsTrigger>
                        {/*<TabsTrigger*/}
                        {/*  value="details"*/}
                        {/*  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none px-4 h-12 border-b-2 border-transparent"*/}
                        {/*>*/}
                        {/*  <UserCheck className="w-4 h-4 mr-2" />*/}
                        {/*  Pool Owner*/}
                        {/*</TabsTrigger>*/}
                      </TabsList>
                    </div>

                    {/* Tab Content Area */}
                    <div className="flex-1 overflow-hidden bg-gray-50/30 dark:bg-gray-900/10">

                      {/* --- RESOURCES TAB --- */}
                      <TabsContent value="resources" className="h-full mt-0">
                        <ScrollArea className="h-full w-full">
                          <div className="p-6">
                            {!data.resources || data.resources.length === 0 ? (
                              <div
                                className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-white/50 dark:bg-gray-800/50">
                                <Users className="w-12 h-12 text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">No resources in this pool</p>
                              </div>
                            ) : (
                              <div className={`grid gap-4 ${isFullscreen
                                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                }`}>
                                {data.resources.map((resource, index) => (
                                  <ResourceCard
                                    key={resource.id}
                                    resource={resource}
                                    index={index}
                                    showActions={false}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      {/* --- POOL OWNER TAB --- */}
                      {/*<TabsContent value="details" className="h-full mt-0">*/}
                      {/*  <ScrollArea className="h-full w-full">*/}
                      {/*    <div className="p-6 max-w-2xl">*/}
                      {/*      <div*/}
                      {/*        className="bg-white dark:bg-gray-800 border border-border rounded-xl p-6 shadow-sm">*/}
                      {/*        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pool*/}
                      {/*          Owner Details</h3>*/}

                      {/*        <div className="flex items-start gap-6">*/}
                      {/*          /!* Avatar *!/*/}
                      {/*          <div*/}
                      {/*            className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">*/}
                      {/*            {data.pool_owner.profile_picture ? (*/}
                      {/*              <img src={data.pool_owner.profile_picture} alt=""*/}
                      {/*                   className="w-full h-full rounded-full object-cover" />*/}
                      {/*            ) : (*/}
                      {/*              <span>{data.pool_owner.first_name[0]}{data.pool_owner.last_name[0]}</span>*/}
                      {/*            )}*/}
                      {/*          </div>*/}

                      {/*          /!* Info *!/*/}
                      {/*          <div className="space-y-3 flex-1">*/}
                      {/*            <div>*/}
                      {/*              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">*/}
                      {/*                {data.pool_owner.first_name} {data.pool_owner.last_name}*/}
                      {/*              </h4>*/}
                      {/*              <span className="text-sm text-gray-500">Pool Administrator</span>*/}
                      {/*            </div>*/}

                      {/*            <div className="space-y-2">*/}
                      {/*              <div*/}
                      {/*                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">*/}
                      {/*                <MailIcon className="w-4 h-4 text-blue-500" />*/}
                      {/*                <span*/}
                      {/*                  className="text-sm text-gray-700 dark:text-gray-300">{data.pool_owner.email}</span>*/}
                      {/*              </div>*/}

                      {/*              {data.pool_owner.mobile_number && (*/}
                      {/*                <div*/}
                      {/*                  className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">*/}
                      {/*                  <PhoneIcon className="w-4 h-4 text-green-500" />*/}
                      {/*                  <span*/}
                      {/*                    className="text-sm text-gray-700 dark:text-gray-300">{data.pool_owner.mobile_number}</span>*/}
                      {/*                </div>*/}
                      {/*              )}*/}
                      {/*            </div>*/}
                      {/*          </div>*/}
                      {/*        </div>*/}
                      {/*      </div>*/}

                      {/*      /!* Additional Pool Meta Info *!/*/}
                      {/*      <div className="mt-6 grid grid-cols-2 gap-4">*/}
                      {/*        <div*/}
                      {/*          className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4">*/}
                      {/*          <div className="text-xs text-gray-500">Created By</div>*/}
                      {/*          <div className="font-medium text-gray-900 dark:text-gray-100 truncate"*/}
                      {/*               title={data.createdBy}>{data.createdBy}</div>*/}
                      {/*          <div className="text-[10px] text-gray-400 mt-1">*/}
                      {/*            {new Date(data.createdAt).toLocaleDateString()}*/}
                      {/*          </div>*/}
                      {/*        </div>*/}
                      {/*        <div*/}
                      {/*          className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4">*/}
                      {/*          <div className="text-xs text-gray-500">Last Updated</div>*/}
                      {/*          <div className="font-medium text-gray-900 dark:text-gray-100 truncate"*/}
                      {/*               title={data.updatedBy}>{data.updatedBy}</div>*/}
                      {/*          <div className="text-[10px] text-gray-400 mt-1">*/}
                      {/*            {new Date(data.updatedAt).toLocaleDateString()}*/}
                      {/*          </div>*/}
                      {/*        </div>*/}
                      {/*      </div>*/}
                      {/*    </div>*/}
                      {/*  </ScrollArea>*/}
                      {/*</TabsContent>*/}

                    </div>
                  </Tabs>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-4 mb-4">
                    <XIcon className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Details Not Found</h3>
                  <p className="text-gray-500 mt-2 max-w-xs">Could not load resource group data. The record might have
                    been deleted.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-red-500">
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-sm mt-1">You do not have permission to view resource groups.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResourcePoolViewModal;