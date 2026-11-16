'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info, Trash } from 'lucide-react';
import { checkDeleteUser, deleteUser } from '@/services/user-management/user-service';
import { toast } from 'sonner';
import {
  BlockedDeletionAlert,
  formatCountsToStatItems,
  parseDeleteError,
  showDeleteBlockedToast,
  type ParsedDeleteError,
} from '@/components/DeleteModal';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  companyId?: number;
  onSuccess: () => void;
}

interface CheckResult {
  hasResource: boolean;
  resourceId: number | null;
  resourcePoolsCount: number;
  tasksCount: number;
  ticketsCount: number;
  taskSpacesCount?: number;
  ticketSpacesCount?: number;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  companyId,
  onSuccess,
}) => {
  const [checking, setChecking] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [deleteResource, setDeleteResource] = useState(false);
  const [parsedError, setParsedError] = useState<ParsedDeleteError | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState('this company');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const activeCo = JSON.parse(localStorage.getItem('active_company') || 'null');
        if (activeCo) {
          const nameToUse = activeCo.company || activeCo.companyName || activeCo.name || activeCo.company_name;
          if (nameToUse) {
            setActiveCompanyName(nameToUse?.trim());
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      setChecking(true);
      setParsedError(null);
      checkDeleteUser(userId, companyId)
        .then((res) => {
          setCheckResult(res.data);
          setChecking(false);
        })
        .catch((err: unknown) => {
          const parsed = showDeleteBlockedToast(
            err,
            'Failed to check user assignments.',
          );
          setParsedError(parsed);
          setChecking(false);
        });
    }
  }, [isOpen, userId, companyId]);

  const preCheckBlockingItems = useMemo(() => {
    if (!checkResult) return [];
    return formatCountsToStatItems({
      resourcePoolsCount: checkResult.resourcePoolsCount,
      tasksCount: checkResult.tasksCount,
      ticketsCount: checkResult.ticketsCount,
      taskSpacesCount: checkResult.taskSpacesCount,
      ticketSpacesCount: checkResult.ticketSpacesCount,
    });
  }, [checkResult]);

  const isHardBlockedByPreCheck = preCheckBlockingItems.length > 0;

  const handleDelete = async () => {
    if (!checkResult) return;
    setDeleting(true);
    setParsedError(null);

    const deleteLinkedResources =
      checkResult.tasksCount > 0 || checkResult.ticketsCount > 0;

    try {
      const response = await deleteUser(
        userId,
        deleteLinkedResources,
        deleteResource,
        companyId,
      );

      if (response?.data?.status >= 400 || response?.status >= 400) {
        const syntheticErr = { response: { data: response.data } };
        const parsed = showDeleteBlockedToast(
          syntheticErr,
          'Failed to delete user.',
        );
        setParsedError(parsed);
        setDeleting(false);
        return;
      }

      toast.success(response?.data?.message || 'User removed successfully.');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const parsed = showDeleteBlockedToast(err, 'Failed to delete user.');
      setParsedError(parsed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pb-1 text-gray-900">
            Remove {userName} from {activeCompanyName}
          </DialogTitle>
        </DialogHeader>

        {checking ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
            <p className="text-xs text-gray-900 font-medium">Checking user assignments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Backend Error State (400/409) */}
            {parsedError && (
              <BlockedDeletionAlert
                title={parsedError.title}
                message={parsedError.message}
                items={parsedError.items}
              />
            )}

            {/* Pre-check Linked Records Structured UI */}
            {!parsedError && checkResult && (
              <>
                {isHardBlockedByPreCheck && (
                  <BlockedDeletionAlert
                    variant="warning"
                    title={`Deletion Blocked in ${activeCompanyName}`}
                    items={preCheckBlockingItems}
                    footerHint={`Please reassign or remove ${userName} from these active records before removing them from ${activeCompanyName}.`}
                  />
                )}

                <div className="flex items-start gap-2 rounded-md bg-gray-50 border border-gray-200 p-3">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-gray-900" />
                  <span className="text-xs leading-relaxed text-gray-900">
                    This will only remove the user from <span className="font-semibold text-gray-900">{activeCompanyName}</span>.
                    Their global Synlio account in other companies will not be affected.
                  </span>
                </div>

                {/* Checkbox for Resource deletion */}
                {!isHardBlockedByPreCheck && checkResult.hasResource && (
                  <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md bg-white">
                    <Checkbox
                      id="delete-resource"
                      checked={deleteResource}
                      onCheckedChange={(checked) => setDeleteResource(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="delete-resource"
                        className="text-sm font-medium text-gray-900 cursor-pointer select-none"
                      >
                        Delete associated resource
                      </label>
                      <p className="text-xs text-gray-700">
                        Removes {userName}&apos;s resource profile from {activeCompanyName}.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 text-gray-900"
          >
            Cancel
          </Button>
          {!checking && !isHardBlockedByPreCheck && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 text-white [&_svg]:text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2 text-white" />
                  Remove
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteUserModal;
