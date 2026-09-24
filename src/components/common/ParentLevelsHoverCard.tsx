import React, { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getPostHierarchy } from "@/services/pulse/pulse.service";
import { Loader2, AlertCircle, Ticket } from "lucide-react";
import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";
import { cn } from "@/lib/utils";

interface ParentLevelsHoverCardProps {
  id: number;
  postType: 'Task' | 'Ticket';
  code: string;
  className?: string;
  onClick?: () => void;
}

export const ParentHierarchyView: React.FC<{ id: number; postType: 'Task' | 'Ticket'; code: string; size?: 'sm' | 'xs' }> = ({ id, postType, code, size = 'sm' }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    const fetchHierarchy = async () => {
      try {
        const res = await getPostHierarchy(id, postType);
        if (mounted) setData(res);
      } catch (err) {
        console.error(err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchHierarchy();
    return () => { mounted = false; };
  }, [id, postType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-2 text-destructive">
        <AlertCircle className="w-5 h-5" />
        <span className="text-xs font-medium">Failed to load details</span>
      </div>
    );
  }

  if (!data) return null;

  const textSizeClass = size === 'xs' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex flex-col gap-0.5 ${textSizeClass}`}>
      {postType === 'Task' ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col relative mt-1">
            {/* Space Node (Root) */}
            <div className="relative flex items-start gap-2" style={{ marginLeft: 0 }}>
              <div className="flex flex-col pb-3">
                <span className={`${textSizeClass} text-foreground mt-0.5 leading-tight`}>
                  <span className="font-semibold pr-2 text-blue-500 dark:text-blue-400">{data.spacePrefix}</span>
                  {data.spaceName}
                </span>
              </div>
            </div>
            {/* Hierarchy nodes */}
            {data.hierarchy?.map((hItem: any, index: number) => {
              const Icon = getHierarchyLevelIcon(hItem.hierarchyLevelIcon);
              const shift = index + 1;
              return (
                <div key={hItem.id} className="relative flex items-start gap-2" style={{ marginLeft: shift * 20 }}>
                  <div
                    className="absolute border-l-2 border-b-2 border-muted-foreground/30 pointer-events-none"
                    style={{
                      left: -12,
                      top: index === 0 ? -12 : -24,
                      width: 16,
                      height: index === 0 ? 20 : 32,
                      borderBottomLeftRadius: 6
                    }}
                  />
                  <div className="mt-0.5 shrink-0 relative z-10 bg-white dark:bg-gray-800 rounded-full">
                    <Icon style={{ color: hItem.hierarchyLevelColor || '#6b7280' }} className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col pb-3">
                    <div className={`flex items-start gap-1.5 mt-0.5`}>
                      <span className="text-xs px-1 py-0 rounded shrink-0 font-semibold text-blue-500 dark:text-blue-400">{hItem.code}</span>
                      <span className="line-clamp-2 leading-tight">{hItem.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col relative mt-1">
            {/* Space Node (Root) */}
            <div className="relative flex items-start gap-2" style={{ marginLeft: 0 }}>
              <div className="flex flex-col pb-3">
                <span className={`${textSizeClass} text-foreground mt-0.5 leading-tight`}>
                  <span className="pr-2 font-semibold text-blue-500 dark:text-blue-400">{data.spacePrefix}</span>
                  {data.spaceName}
                </span>
              </div>
            </div>
            {/* Ticket Node */}
            <div className="relative flex items-start gap-2" style={{ marginLeft: 20 }}>
              <div
                className="absolute border-l-2 border-b-2 border-muted-foreground/30 pointer-events-none"
                style={{
                  left: -12,
                  top: -12,
                  width: 16,
                  height: 20,
                  borderBottomLeftRadius: 6
                }}
              />
              <div className="mt-0.5 shrink-0 relative z-10 bg-white dark:bg-gray-800 rounded-full">
                <Ticket className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="flex flex-col pb-3">
                <div className="flex items-start gap-1.5 mt-0.5 text-foreground">
                  <span className="text-xs px-1 py-0 rounded shrink-0 font-semibold text-blue-500 dark:text-blue-400">{data.spacePrefix ? `${data.spacePrefix}-${code.split('-').pop()}` : code}</span>
                  <span className="line-clamp-2 leading-tight">{data.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ParentLevelsHoverCard: React.FC<ParentLevelsHoverCardProps> = ({ id, postType, code, className, onClick }) => {
  return (
    <HoverCard openDelay={200} closeDelay={200}>
      <HoverCardTrigger asChild>
        <span
          style={{ color: '#3B82F6' }}
          className={cn("font-semibold cursor-pointer hover:underline", className)}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          {code}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto min-w-64 max-w-md" side="top">
        <ParentHierarchyView id={id} postType={postType} code={code} />
      </HoverCardContent>
    </HoverCard>
  );
};
