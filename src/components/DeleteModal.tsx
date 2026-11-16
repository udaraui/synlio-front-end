'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckSquare,
  FolderKanban,
  Layers,
  LifeBuoy,
  Loader2,
  Shield,
  ShieldAlert,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface DeleteDependencyCounts {
  usersCount?: number;
  divisionsCount?: number;
  rolesCount?: number;
  userCompanyRolesCount?: number;
  calendarsCount?: number;
  resourcesCount?: number;
  resourcePoolsCount?: number;
  taskSpacesCount?: number;
  ticketSpacesCount?: number;
  tasksCount?: number;
  ticketsCount?: number;
  [key: string]: number | undefined;
}

export interface DependencyStatItem {
  key: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface DeleteResponsePayload {
  status?: number;
  message?: string | string[];
  error?: string;
  counts?: DeleteDependencyCounts;
}

interface DeleteActionResult {
  status?: number;
  data?: DeleteResponsePayload;
}

interface AxiosErrorLike {
  response?: {
    status?: number;
    data?: DeleteResponsePayload;
  };
  message?: string;
}

export interface ParsedDeleteError {
  status?: number;
  title: string;
  message: string;
  items: DependencyStatItem[];
}

const COUNT_META_MAP: Record<
  string,
  {
    singular: string;
    plural: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  usersCount: { singular: 'User', plural: 'Users', icon: Users },
  divisionsCount: { singular: 'Division', plural: 'Divisions', icon: Building2 },
  rolesCount: { singular: 'Role', plural: 'Roles', icon: Shield },
  userCompanyRolesCount: {
    singular: 'Role Assignment',
    plural: 'Role Assignments',
    icon: Shield,
  },
  calendarsCount: { singular: 'Calendar', plural: 'Calendars', icon: Calendar },
  resourcesCount: {
    singular: 'Resource',
    plural: 'Resources',
    icon: UserCheck,
  },
  resourcePoolsCount: {
    singular: 'Resource Group',
    plural: 'Resource Groups',
    icon: Layers,
  },
  taskSpacesCount: {
    singular: 'Task Space',
    plural: 'Task Spaces',
    icon: FolderKanban,
  },
  ticketSpacesCount: {
    singular: 'Ticket Space',
    plural: 'Ticket Spaces',
    icon: LifeBuoy,
  },
  tasksCount: { singular: 'Task', plural: 'Tasks', icon: CheckSquare },
  ticketsCount: { singular: 'Ticket', plural: 'Tickets', icon: Ticket },
};

export const formatCountsToStatItems = (
  counts?: DeleteDependencyCounts | null,
): DependencyStatItem[] => {
  if (!counts || typeof counts !== 'object') return [];

  const items: DependencyStatItem[] = [];

  for (const [key, rawVal] of Object.entries(counts)) {
    const count = Number(rawVal);
    if (!Number.isFinite(count) || count <= 0) continue;

    const meta = COUNT_META_MAP[key];
    if (meta) {
      items.push({
        key,
        count,
        label: count === 1 ? meta.singular : meta.plural,
        icon: meta.icon,
      });
    } else {
      const cleanName = key
        .replace(/Count$/i, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      items.push({
        key,
        count,
        label: cleanName,
        icon: Layers,
      });
    }
  }

  return items;
};

const parseFallbackCountsFromMessage = (message: string): DependencyStatItem[] => {
  const patterns: Array<{
    key: string;
    regex: RegExp;
  }> = [
    { key: 'usersCount', regex: /(\d+)\s+(?:active\s+|assigned\s+|associated\s+)?user(?:s|\(s\))?(?!\s*role)/i },
    { key: 'divisionsCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?division(?:s|\(s\))?/i },
    { key: 'rolesCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?role(?:s|\(s\))?/i },
    { key: 'calendarsCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?calendar(?:s|\(s\))?/i },
    { key: 'resourcePoolsCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?resource\s+(?:pool|group)(?:s|\(s\))?/i },
    { key: 'resourcesCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?resource(?:s|\(s\))?(?!\s*(?:pool|group))/i },
    { key: 'taskSpacesCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?task\s+space(?:s|\(s\))?/i },
    { key: 'ticketSpacesCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?ticket\s+space(?:s|\(s\))?/i },
    { key: 'tasksCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?task(?:s|\(s\))?(?!\s*space)/i },
    { key: 'ticketsCount', regex: /(\d+)\s+(?:active\s+|associated\s+)?ticket(?:s|\(s\))?(?!\s*space)/i },
  ];

  const derivedCounts: DeleteDependencyCounts = {};
  for (const { key, regex } of patterns) {
    const match = message.match(regex);
    if (match && Number(match[1]) > 0) {
      derivedCounts[key] = Number(match[1]);
    }
  }

  return formatCountsToStatItems(derivedCounts);
};

export const parseDeleteError = (
  error: unknown,
  fallbackMessage = 'Unable to complete deletion due to active dependencies.',
): ParsedDeleteError => {
  const axiosError = error as AxiosErrorLike | undefined;
  const payload = axiosError?.response?.data;
  const status = payload?.status ?? axiosError?.response?.status;

  let message = fallbackMessage;
  const rawMessage = payload?.message;

  if (Array.isArray(rawMessage) && rawMessage.length > 0) {
    message = rawMessage.join(', ');
  } else if (
    typeof rawMessage === 'string' &&
    rawMessage.trim().length > 0 &&
    rawMessage.trim().toLowerCase() !== 'internal server error'
  ) {
    message = rawMessage.trim();
  } else if (
    typeof payload?.error === 'string' &&
    payload.error.trim().length > 0 &&
    payload.error.trim().toLowerCase() !== 'internal server error'
  ) {
    message = payload.error.trim();
  } else if (
    typeof axiosError?.message === 'string' &&
    axiosError.message.trim().length > 0 &&
    !axiosError.message.toLowerCase().includes('status code 500') &&
    axiosError.message.trim().toLowerCase() !== 'internal server error'
  ) {
    message = axiosError.message.trim();
  }

  const structuredItems = formatCountsToStatItems(payload?.counts);
  const items =
    structuredItems.length > 0
      ? structuredItems
      : parseFallbackCountsFromMessage(message);

  const isBlocked = status === 409 || status === 400 || items.length > 0;

  return {
    status,
    title: isBlocked ? 'Deletion Blocked' : 'Deletion Failed',
    message,
    items,
  };
};

export const showDeleteBlockedToast = (
  error: unknown,
  fallbackMessage = 'Unable to complete deletion due to active dependencies.',
): ParsedDeleteError => {
  const parsed = parseDeleteError(error, fallbackMessage);

  toast.error(parsed.title, {
    description:
      parsed.items.length > 0 ? (
        <div className="mt-1.5 space-y-2">
          <p className="text-xs text-gray-900 leading-relaxed">
            This record cannot be deleted because it has active linked data:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.items.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-white text-gray-900 border border-gray-200"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gray-900" />
                  <span className="font-semibold text-gray-900">{item.count}</span>
                  <span className="text-gray-900">{item.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <span className="text-xs text-gray-900">{parsed.message}</span>
      ),
    duration: 6000,
  });

  return parsed;
};

export interface BlockedDeletionAlertProps {
  title?: string;
  message?: string;
  items?: DependencyStatItem[];
  footerHint?: string;
  variant?: 'error' | 'warning';
}

export const BlockedDeletionAlert: React.FC<BlockedDeletionAlertProps> = ({
  title = 'Deletion Blocked — Linked Records Found',
  message,
  items = [],
  footerHint = 'Please reassign or remove these linked records before attempting deletion.',
  variant = 'error',
}) => {
  const isWarning = variant === 'warning';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        {isWarning ? (
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
        ) : (
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
        )}
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-gray-900">
            {title}
          </p>
          {items.length === 0 && message && (
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-gray-900">
              {message}
            </p>
          )}
          {items.length > 0 && (
            <p className="text-xs leading-relaxed text-gray-700">
              The following active relationships are preventing this action:
            </p>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center gap-2.5 rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-2xs"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-900" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                      {item.count}
                    </span>
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {item.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && footerHint && (
        <p className="text-xs font-medium text-gray-900 pt-2 border-t border-gray-200">
          {footerHint}
        </p>
      )}
    </div>
  );
};

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<unknown>;
  id?: string | number;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonIcon?: React.ReactNode;
  buttonClassName?: string;
  itemName?: string;
  warningText?: string;
  showWarningIcon?: boolean;
  confirmationRequired?: boolean;
  confirmationText?: string;
  hideActionButtonOnError?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  buttonText = 'Delete',
  buttonVariant = 'destructive',
  buttonIcon,
  itemName,
  warningText,
  confirmationRequired = false,
  confirmationText = 'DELETE',
  hideActionButtonOnError = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [parsedError, setParsedError] = useState<ParsedDeleteError | null>(null);
  const [justErrored, setJustErrored] = useState(false);

  const handleDelete = async () => {
    if (confirmationRequired && confirmationInput !== confirmationText) {
      return;
    }
    setParsedError(null);
    setJustErrored(false);
    setIsDeleting(true);

    try {
      const result = (await onDelete()) as DeleteActionResult | undefined;
      if (result && typeof result === 'object' && 'data' in result && result.data) {
        if (Number(result.data.status) >= 400) {
          const parsed = parseDeleteError({ response: { data: result.data } });
          setParsedError(parsed);
          setJustErrored(true);
          return;
        }
      }
      // Success path
      onClose();
      setConfirmationInput('');
    } catch (error: unknown) {
      const parsed = parseDeleteError(error);
      setParsedError(parsed);
      setJustErrored(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = (openState: boolean) => {
    if (openState === false) {
      if (justErrored) {
        setJustErrored(false);
        return;
      }

      if (!isDeleting) {
        setParsedError(null);
        setConfirmationInput('');
        onClose();
      }
    }
  };

  const isConfirmationValid = !confirmationRequired || confirmationInput === confirmationText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            {title}
          </DialogTitle>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-gray-900">{description}</p>
            {itemName && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-gray-900 border-gray-300 bg-white font-semibold"
                >
                  {itemName}
                </Badge>
              </div>
            )}

            {/* Structured Blocked Deletion UI */}
            {parsedError && (
              <BlockedDeletionAlert
                title={parsedError.title}
                message={parsedError.message}
                items={parsedError.items}
              />
            )}

            {/* Static warning text only if no dynamic error is present */}
            {!parsedError && warningText && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-900 font-medium leading-relaxed">
                  {warningText}
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        {confirmationRequired && (
          <div className="space-y-2">
            <label htmlFor="confirmation" className="text-sm font-medium text-gray-900">
              Type <span className="font-semibold text-red-600">{confirmationText}</span> to confirm:
            </label>
            <input
              id="confirmation"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder={confirmationText}
              disabled={isDeleting}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isDeleting}
            className="flex-1 text-gray-900"
          >
            Cancel
          </Button>
          {!(hideActionButtonOnError && parsedError) && (
            <Button
              variant={buttonVariant}
              onClick={handleDelete}
              disabled={isDeleting || !isConfirmationValid}
              className={cn(
                'flex-1',
                (buttonVariant === 'destructive' || buttonVariant === 'default') &&
                  'text-white [&_svg]:text-white',
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Deleting...
                </>
              ) : (
                <>
                  {buttonIcon && <span className="mr-2 text-white">{buttonIcon}</span>}
                  {buttonText}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModal;