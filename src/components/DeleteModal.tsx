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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteResult {
  status: number;
  message: string;
  error?: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<any | void>;
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
  id,
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  buttonText = 'Delete',
  buttonVariant = 'destructive',
  buttonIcon,
  buttonClassName = '',
  itemName,
  warningText,
  showWarningIcon = true,
  confirmationRequired = false,
  confirmationText = 'DELETE',
  hideActionButtonOnError = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [error, setError] = useState('');
  // 💡 FIX 1: State to track if an error just occurred
  const [justErrored, setJustErrored] = useState(false);

  const handleDelete = async () => {
    if (confirmationRequired && confirmationInput !== confirmationText) {
      return;
    }
    setError('');
    setJustErrored(false); // Reset flag before starting
    setIsDeleting(true);

    try {
      const result = await onDelete();
      if (result && typeof result === 'object' && 'status' in result) {
        // If the status in the RESPONSE BODY is 400 (or greater), it's an application error.
        if (Number(result.data.status) >= 400) {
          setError(result.data.message);
          setJustErrored(true); // Keep modal open
          return; // IMPORTANT: Exit the function here
        }
      }
      // Success path
      onClose();
      setConfirmationInput('');

    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } | undefined, message?: string };

      // Use the asserted object for optional chaining
      const backendMessage = axiosError.response?.data?.message || axiosError.message;

      setError(backendMessage || 'An unexpected error occurred during deletion.');
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
        setError(''); // Clear error state when the modal is manually closed
        setConfirmationInput('');
        onClose();
      }
    }
  };

  const isConfirmationValid = !confirmationRequired || confirmationInput === confirmationText;

  return (
    // 💡 FIX 4: Pass the open state to handleClose
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
          </DialogTitle>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{description}</p>
            {itemName && (
              <div className="text-sm font-medium text-foreground">
                <span className="text-destructive">{itemName}</span>
              </div>
            )}

            {/* Display the backend error message if one exists */}
            {error && (
              <div className="border border-dashed border-destructive/50 p-3 rounded-md">
                <p className="text-sm text-destructive whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}

            {/* Display the static warning text only if no dynamic error is present */}
            {!error && warningText && (
              <div className="border border-dashed border-destructive/50 p-3 rounded-md">
                <p className="text-sm text-destructive font-medium">
                  {warningText}
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        {confirmationRequired && (
          <div className="space-y-2">
            <label htmlFor="confirmation" className="text-sm font-medium">
              Type <span className="text-destructive">{confirmationText}</span> to confirm:
            </label>
            <input
              id="confirmation"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder={confirmationText}
              disabled={isDeleting}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)} // Call with false to trigger close
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          {!(hideActionButtonOnError && error) && (
            <Button
              variant={buttonVariant}
              onClick={handleDelete}
              disabled={isDeleting || !isConfirmationValid}
              className={cn('flex-1')}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  {buttonIcon && <span className="mr-2">{buttonIcon}</span>}
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