'use client';

import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState('');
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
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      setChecking(true);
      setError('');
      checkDeleteUser(userId, companyId)
        .then((res) => {
          setCheckResult(res.data);
          setChecking(false);
        })
        .catch((err) => {
          const errMsg = err.response?.data?.message || err.message || 'Failed to check user details.';
          setError(errMsg);
          setChecking(false);
        });
    }
  }, [isOpen, userId, companyId]);

  const handleDelete = async () => {
    if (!checkResult) return;
    setDeleting(true);
    setError('');

    const deleteLinkedResources = checkResult.tasksCount > 0 || checkResult.ticketsCount > 0;

    try {
      const response = await deleteUser(
        userId,
        deleteLinkedResources,
        deleteResource,
        companyId
      );

      if (response?.data?.status >= 400 || response?.status >= 400) {
        setError(response?.data?.message || 'Failed to delete user.');
        setDeleting(false);
        return;
      }

      toast.success(response?.data?.message || 'User deleted');
      onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete user.';
      setError(errMsg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pb-1">
            {/* <span className="mr-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span> */}
            Remove {userName} from {activeCompanyName}
          </DialogTitle>
          {/* <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <span className="font-semibold text-foreground">{userName}</span> from this company? This action cannot be undone.
            </p>
          </div> */}
        </DialogHeader>

        {checking ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium">Checking user assignments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 border border-red-400 rounded-md">
                <p className="text-sm text-red-700 whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}

            {checkResult && (
              <>
                {/* Hard block: Resource group Ownership */}
                {checkResult.resourcePoolsCount > 0 && (
                  <div className="text-sm text-destructive flex items-start gap-1.5">
                    {/* <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> */}
                    <span>
                      This user owns {checkResult.resourcePoolsCount} resource group(s) in {activeCompanyName}. You must reassign ownership of these pools before removing the user.
                    </span>
                  </div>
                )}

                {/* Warning: Tasks/Tickets Assignments */}
                {checkResult.resourcePoolsCount === 0 && (checkResult.tasksCount > 0 || checkResult.ticketsCount > 0) && (
                  <div className="text-sm text-destructive flex items-start gap-1.5">
                    {/* <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> */}
                    <span>
                      This user is currently linked to{' '}
                      {checkResult.tasksCount > 0 && `${checkResult.tasksCount} task(s)`}
                      {checkResult.tasksCount > 0 && checkResult.ticketsCount > 0 && ' and '}
                      {checkResult.ticketsCount > 0 && `${checkResult.ticketsCount} ticket(s)`}
                      {' '}in {activeCompanyName}. Proceeding will automatically unassign them.
                    </span>
                  </div>
                )}

                <div className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    This will only remove the user from {activeCompanyName}.
                    Their global Synlio account will not be deleted.
                  </span>
                </div>

                {/* Checkbox for Resource deletion */}
                {checkResult.resourcePoolsCount === 0 && checkResult.hasResource && (
                  <div className="flex items-start space-x-3 p-3 border border-border rounded-md">
                    <Checkbox
                      id="delete-resource"
                      checked={deleteResource}
                      onCheckedChange={(checked) => setDeleteResource(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="delete-resource"
                        className="text-sm font-medium cursor-pointer select-none"
                      >
                        Delete associated resource
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Removes {userName}'s resource profile from {activeCompanyName}.
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
            className="flex-1"
          >
            Cancel
          </Button>
          {!checking && (!checkResult || checkResult.resourcePoolsCount === 0) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash className='h-4 w-4 mr-2' />
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
