'use client';

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

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLeave: () => void;
  onContinueEditing: () => void;
  title?: string;
  description?: string;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirmLeave,
  onContinueEditing,
  title = 'Unsaved Changes',
  description = 'You have unsaved changes. Do you want to leave without saving or continue editing?',
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueEditing}>
            Continue
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmLeave}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

