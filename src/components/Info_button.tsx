import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { InfoIcon, User, Calendar } from "lucide-react";

function Info_button({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: {
  id: number;
  createdBy: string;
  createdAt: Date | string;
  updatedBy: string;
  updatedAt: Date | string;
}) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors"
        >
          <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm px-3 py-2.5">
        <div className="space-y-3">
          {/* Created Section */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">Created By</p>
            <p className="text-xs font-medium">{createdBy || "System"}</p>
            <p className="text-sm text-muted-foreground">
              {createdAt ? formatDate(typeof createdAt === 'string' ? createdAt : createdAt.toISOString()) : "Not available"}
            </p>
          </div>

          {/* Updated Section */}
          <div className="space-y-0.5 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">Last Updated By</p>
            <p className="text-xs font-medium">{updatedBy || "System"}</p>
            <p className="text-sm text-muted-foreground">
              {updatedAt ? formatDate(typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString()) : "Not available"}
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default Info_button;
