'use client';

import React, { useRef } from 'react';
import { Check, Loader2, Plus, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LabelItem {
  id: number;
  name: string;
}

export interface TaskLabelDropdownProps {
  /** Labels currently applied to the task */
  appliedLabels: LabelItem[];
  /** All labels available for the task-space */
  availableLabels: LabelItem[];
  /** Controlled open state of the popover */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Controlled search string */
  search: string;
  onSearchChange: (val: string) => void;
  /** Called when user picks an un-applied label */
  onAdd: (label: LabelItem) => void;
  /** Called when user removes an applied label */
  onRemove: (labelId: number) => void;
  /** Called when user creates a brand-new label (name = trimmed search string) */
  onCreate: (name: string) => Promise<void>;
  /** Show spinner in the list while fetching available labels */
  isLoading?: boolean;
  /** Disable create button while saving */
  isCreating?: boolean;
  /**
   * "table"  → trigger shows first label + "+N more" (or dashed "Add label")
   *            dropdown marks already-applied items with a tick (toggle behaviour)
   * "form"   → trigger shows every applied label + dashed "+ Add label" at the end
   *            dropdown only lists unapplied labels
   */
  mode: 'table' | 'form';
  /** Popover placement */
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Called when the mouse leaves the PopoverContent (useful for table-row auto-close) */
  onMouseLeaveContent?: () => void;
  /** Extra class applied to the trigger wrapper div */
  triggerClassName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskLabelDropdown({
  appliedLabels,
  availableLabels,
  open,
  onOpenChange,
  search,
  onSearchChange,
  onAdd,
  onRemove,
  onCreate,
  isLoading = false,
  isCreating = false,
  mode,
  align = 'start',
  side = 'bottom',
  onMouseLeaveContent,
  triggerClassName,
}: TaskLabelDropdownProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // ── derived ───────────────────────────────────────────────────────────────
  const appliedSet = new Set(appliedLabels.map((l) => l.id));

  const filtered = availableLabels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  const canCreate =
    search.trim().length > 0 &&
    !availableLabels.some(
      (l) => l.name.toLowerCase() === search.trim().toLowerCase(),
    );

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleToggle = (label: LabelItem) => {
    if (appliedSet.has(label.id)) {
      onRemove(label.id);
    } else {
      onAdd(label);
      if (mode === 'form') onOpenChange(false);
    }
    onSearchChange('');
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    await onCreate(name);
    onSearchChange('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canCreate) handleCreate();
  };

  const handleOpenChange = (next: boolean) => {
    if (next) onSearchChange('');
    onOpenChange(next);
  };

  // ── trigger ───────────────────────────────────────────────────────────────
  const Trigger =
    mode === 'table' ? (
      <TableTrigger
        appliedLabels={appliedLabels}
        onRemove={onRemove}
        className={triggerClassName}
      />
    ) : (
      <FormTrigger
        appliedLabels={appliedLabels}
        onRemove={onRemove}
        className={triggerClassName}
      />
    );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {Trigger}
      </PopoverTrigger>

      <PopoverContent
        className="w-60 p-0 shadow-lg"
        align={align}
        side={side}
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={onMouseLeaveContent}
      >
        {/* ── Title ── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          {/*<Tag className="w-3.5 h-3.5 text-muted-foreground" />*/}
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide">
            Select Labels
          </span>
        </div>

        {/* ── Search ── */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            ref={searchRef}
            autoFocus
            type="text"
            placeholder="Search or create label…"
            className="flex-1 text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {search && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => onSearchChange('')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* ── Label list ── */}
        <div className="max-h-48 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-5">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 && !canCreate ? (
            <p className="px-3 py-2.5 text-xs text-gray-400 italic">
              {availableLabels.length === 0
                ? 'No labels for this space'
                : search
                ? 'No matching labels'
                : 'All labels applied'}
            </p>
          ) : (
            filtered.map((label) => {
              const isApplied = appliedSet.has(label.id);
              // In form mode, hide already-applied labels (they're shown as badges outside)
              if (mode === 'form' && isApplied) return null;
              return (
                <button
                  key={label.id}
                  type="button"
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors',
                    isApplied
                      ? 'text-primary bg-primary/5 hover:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                  )}
                  onClick={() => handleToggle(label)}
                >
                  <span className="truncate">{label.name}</span>
                  {isApplied && (
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Create option ── */}
        {!isLoading && canCreate && (
          <div className="border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              disabled={isCreating}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              onClick={handleCreate}
            >
              {isCreating ? (
                <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
              ) : (
                <Plus className="w-3 h-3 shrink-0" />
              )}
              {isCreating ? 'Creating…' : `Create "${search.trim()}"`}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Trigger: Table mode — first badge + "+N more" OR dashed "Add label"
// ---------------------------------------------------------------------------

interface TriggerProps {
  appliedLabels: LabelItem[];
  onRemove: (id: number) => void;
  className?: string;
}

const TableTrigger = React.forwardRef<HTMLDivElement, TriggerProps>(
  ({ appliedLabels, onRemove, className, ...rest }, ref) => {
    const first = appliedLabels[0] ?? null;
    const extra = appliedLabels.slice(1);

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-1 min-w-0 cursor-pointer', className)}
        {...rest}
      >
        {first ? (
          <>
            <RemovableBadge label={first} onRemove={onRemove} maxWidth="max-w-[110px]" />
            {extra.length > 0 && (
              <Badge
                variant="outline"
                title={`${extra.map((l) => l.name).join(', ')}\n\nClick to add or remove labels`}
                className="text-xs font-normal flex-shrink-0 bg-white dark:bg-transparent cursor-pointer select-none border border-dashed"
              >
                +{extra.length}
              </Badge>
            )}
          </>
        ) : (
          <Badge
            variant="outline"
            className="text-xs border-dashed font-medium text-gray-400 border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent gap-1 cursor-pointer select-none"
          >
            <Plus className="w-3 h-3" />
            Add Label
          </Badge>
        )}
      </div>
    );
  },
);
TableTrigger.displayName = 'TableTrigger';

// ---------------------------------------------------------------------------
// Trigger: Form mode — all badges in a row + dashed "+ Add label" at end
// ---------------------------------------------------------------------------

const FormTrigger = React.forwardRef<HTMLDivElement, TriggerProps>(
  ({ appliedLabels, onRemove, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center flex-wrap gap-1 min-w-0 cursor-pointer',
          className,
        )}
        {...rest}
      >
        {appliedLabels.map((label) => (
          <RemovableBadge key={label.id} label={label} onRemove={onRemove} />
        ))}
        <Badge
          variant="outline"
          className="text-xs border-dashed font-medium text-gray-400 border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent gap-1 cursor-pointer select-none"
        >
          <Plus className="w-3 h-3" />
          Add Label
        </Badge>
      </div>
    );
  },
);
FormTrigger.displayName = 'FormTrigger';

// ---------------------------------------------------------------------------
// RemovableBadge — badge with X on hover
// ---------------------------------------------------------------------------

function RemovableBadge({
  label,
  onRemove,
  maxWidth,
}: {
  label: LabelItem;
  onRemove: (id: number) => void;
  maxWidth?: string;
}) {
  return (
    <span
      className={cn(
        'group/lbl inline-flex items-center gap-0.5 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-transparent cursor-pointer select-none',
        maxWidth,
      )}
    >
      <span className={cn('truncate', maxWidth)}>{label.name}</span>
      <span
        className="w-0 overflow-hidden group-hover/lbl:w-3 transition-all duration-150 flex items-center justify-center flex-shrink-0"
      >
        <button
          type="button"
          title="Remove label"
          className="hover:text-destructive text-destructive flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(label.id);
          }}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </span>
    </span>
  );
}

