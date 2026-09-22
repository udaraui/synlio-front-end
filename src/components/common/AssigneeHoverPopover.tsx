"use client";

import React, { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import axiosInstance from "@/lib/interceptors/axiosInstance";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface AssigneeHoverPopoverProps {
  emails: string[];
  children: React.ReactNode;
}

export function AssigneeHoverPopover({ emails, children }: AssigneeHoverPopoverProps) {
  const canViewUser = usePrivilegeGuard("16");
  const canViewResource = usePrivilegeGuard("17");
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [fetched, setFetched] = useState(false);

  // If both privileges are false, just render children without hover card
  if (!canViewUser && !canViewResource) {
    return <>{children}</>;
  }
  
  useEffect(() => {
    let active = true;
    if (open && !fetched && emails.length > 0) {
      setLoading(true);
      axiosInstance.post('/resource/batch-info-by-emails', { emails })
        .then(res => {
          if (active) {
            setData(res.data || []);
            setFetched(true);
            setLoading(false);
          }
        })
        .catch(err => {
          if (active) {
            console.error("Failed to fetch assignee info", err);
            setLoading(false);
          }
        });
    }
    return () => { active = false; };
  }, [open, fetched, emails]);

  return (
    <HoverCard openDelay={200} closeDelay={200} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer inline-block">{children}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-4 max-h-[400px] overflow-y-auto" align="start">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4">No info found</div>
        ) : (
          <div className="flex flex-col gap-4">
            {data.map((user, index) => (
              <React.Fragment key={user.email}>
                <div className="flex gap-4">
                  {/* Left Side: User Info */}
                  {canViewUser && (
                    <div className="flex gap-3 flex-1 border-r border-gray-100 pr-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profile_pic} />
                        <AvatarFallback>
                          {(user.first_name || user.email)?.[0]}{(user.last_name)?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="text-xs text-gray-500 truncate" title={user.email}>
                          {user.email}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Right Side: Skills */}
                  {canViewResource && (
                    <div className="flex-1 flex flex-wrap gap-1 content-start pl-2">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic mt-1">No skills</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Divider for +N */}
                {index < data.length - 1 && <hr className="border-gray-100 dark:border-gray-800" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
