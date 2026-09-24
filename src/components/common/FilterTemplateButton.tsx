'use client';

import React, { useState } from 'react';
import { Bookmark, BookmarkPlus, Check, ChevronDown, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FilterTemplate } from '@/services/user-management/user-config-service';

interface FilterTemplateButtonProps {
  /** List of saved filter templates */
  templates: FilterTemplate[];
  /** ID of the currently active (applied) template, or null if none */
  activeTemplateId: string | null;
  /** Whether any filter is currently active — used to highlight the chevron button */
  isFilterActive?: boolean;
  /** Whether the save operation is in progress */
  isSaving?: boolean;
  /**
   * Called when the user confirms saving a new template.
   * Receives the chosen name. The parent is responsible for persisting and updating `templates`.
   */
  onSave: (name: string) => Promise<void> | void;
  /** Called when the user clicks a saved template to apply it */
  onApply: (template: FilterTemplate) => void;
  /** Called when the user deletes a saved template */
  onDelete: (templateId: string) => void;
  /** Extra className to merge onto the trigger button */
  className?: string;
}

/**
 * A self-contained dropdown button for managing named filter templates.
 *
 * Renders a small chevron button meant to be placed directly to the right of a
 * "Filters" button (using `rounded-l-none -ml-px` border-joining technique).
 *
 * Usage:
 * ```tsx
 * <div className="inline-flex items-center">
 *   <DropdownMenu>  {/* your Filters dropdown *\/}
 *     <DropdownMenuTrigger asChild>
 *       <Button className="rounded-r-none border-r-0 ...">Filters</Button>
 *     </DropdownMenuTrigger>
 *     ...
 *   </DropdownMenu>
 *
 *   <FilterTemplateButton
 *     templates={templates}
 *     activeTemplateId={activeTemplateId}
 *     isFilterActive={anyFilterActive}
 *     isSaving={isSavingTemplate}
 *     onSave={handleSaveTemplate}
 *     onApply={handleApplyTemplate}
 *     onDelete={handleDeleteTemplate}
 *   />
 * </div>
 * ```
 */
export function FilterTemplateButton({
  templates,
  activeTemplateId,
  isFilterActive = false,
  isSaving = false,
  onSave,
  onApply,
  onDelete,
  className = '',
}: FilterTemplateButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleOpenDialog = () => {
    setTemplateName('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTemplateName('');
  };

  const handleConfirmSave = async () => {
    if (!templateName.trim()) return;
    await onSave(templateName.trim());
    handleCloseDialog();
  };

  const activeHighlight = isFilterActive
    ? ''
    : '';

  return (
    <>
      {/* Chevron Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Filter Templates"
            className={`h-7 w-7 px-0 rounded-l-none -ml-px ${activeHighlight} ${className}`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Save current filters */}
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={handleOpenDialog}>
              <BookmarkPlus className="h-3.5 w-3.5 shrink-0" />
              Save current filters as...
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {/* Saved templates list */}
          {templates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Saved Templates</DropdownMenuLabel>
              <DropdownMenuGroup>
                {templates.map((template) => {
                  const isActive = activeTemplateId === template.id;
                  return (
                    <div key={template.id} className="relative group">
                      <DropdownMenuItem
                        className={`pr-8 ${isActive ? 'bg-primary/10 dark:bg-primary/20 font-medium' : ''}`}
                        onSelect={() => onApply(template)}
                      >
                        {isActive ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{template.name}</span>
                      </DropdownMenuItem>
                      {/* Delete button — visible on hover */}
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(template.id);
                        }}
                        title="Delete template"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Template Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Filter Template</DialogTitle>
            <DialogDescription>
              Give this filter configuration a name to quickly apply it later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-1">
            <label className="text-sm font-medium mb-2 block">Name</label>
            <Input
              placeholder="e.g. Low Priority Open Tickets"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim() && !isSaving) {
                  handleConfirmSave();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={!templateName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className='h-3.5 w-3.5' />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FilterTemplateButton;

