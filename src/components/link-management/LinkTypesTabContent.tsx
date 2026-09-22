'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2, Plus, Link2, Star, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getLinkTypes,
  createLinkType,
  deleteLinkType,
  type LinkType,
  type LinkTypePostType,
} from '@/services/link-management/link-type.service';

/**
 * Creating new link types is disabled for now (product decision) — this may
 * become a requirement again later, so the create UI/logic is kept, just
 * hidden. Flip this back to true to re-enable it.
 */
const ENABLE_LINK_TYPE_CREATION = false;

/**
 * Configure the link types available for a given work item kind.
 * Link types are global (keyed by postType) — project space settings manage
 * the 'Task' set, ticket space settings manage the 'Ticket' set.
 */
export default function LinkTypesTabContent({
  postType,
}: {
  postType: LinkTypePostType;
}) {
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleting, setDeleting] = useState<LinkType | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getLinkTypes(postType);
      setLinkTypes(data);
    } catch {
      toast.error('Failed to load link types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postType]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a link type name');
      return;
    }
    setIsAdding(true);
    try {
      await createLinkType({ name: newName.trim(), postType });
      toast.success('Link type added');
      setNewName('');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add link type');
    } finally {
      setIsAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLinkType(deleting.id);
      toast.success('Link type removed');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove link type');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Link Types
        </CardTitle>
        <CardDescription>
          Define the relationship types users can choose when linking{' '}
          {postType === 'Task' ? 'tasks' : 'tickets'} to other tasks or tickets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {linkTypes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No link types configured.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {linkTypes.map((lt) => (
                  <div
                    key={lt.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-950 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <Link2
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: lt.color || '#6B7280' }}
                    />
                    <span className="text-sm font-medium flex-1">{lt.name}</span>
                    {lt.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        Default
                      </span>
                    )}
                    {(lt.usageCount ?? 0) > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-8 w-8 text-muted-foreground cursor-not-allowed">
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Used by {lt.usageCount} link{lt.usageCount === 1 ? '' : 's'} — remove those links first to delete this type.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(lt)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ENABLE_LINK_TYPE_CREATION && (
              <div className="space-y-2 py-4 border-t">
                <span className="text-sm font-semibold">Add New Link Type</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd();
                    }}
                    placeholder="e.g. Blocks, Depends On, Relates To"
                    className="flex-1"
                  />
                  <Button onClick={handleAdd} disabled={isAdding}>
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove link type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the link type &quot;{deleting?.name}&quot;. Existing
              links using it will keep their reference cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
