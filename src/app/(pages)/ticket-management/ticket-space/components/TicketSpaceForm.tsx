'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { Settings, Loader2, Save } from 'lucide-react';
import { generatePrefix } from '@/lib/prefix-generator';

interface TicketSpaceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (ticketSpace: any, action: 'create' | 'edit') => void;
  type: 'create' | 'edit';
  id?: number;
}

const FORM_ID = 'ticket-space-form';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  prefix: z.string().min(1, { message: 'Prefix is required' }),
  description: z.string().optional(),
  divisionId: z.coerce.number().int().positive({ message: 'Division is required' }),
});

type TicketSpaceFormValues = z.infer<typeof formSchema>;

export function TicketSpaceForm({
  open,
  onOpenChange,
  onUpdate,
  type,
  id,
}: TicketSpaceFormProps) {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [prefixManuallyEdited, setPrefixManuallyEdited] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDivisionLoading, setIsDivisionLoading] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<number>(0);
  const [prefixError, setPrefixError] = useState<string>('');
  const [isPrefixChecking, setIsPrefixChecking] = useState(false);
  const [createdTicketSpaceId, setCreatedTicketSpaceId] = useState<number | null>(null);
  const [updatedTicketSpaceId, setUpdatedTicketSpaceId] = useState<number | null>(null);
  const router = useRouter();

  const form = useForm<TicketSpaceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      prefix: '',
      description: '',
      divisionId: 0,
    },
    mode: 'onChange',
  });

  // Load initial data
  useEffect(() => {
    if (open) {
      // Reset form to default values
      form.reset({
        name: '',
        prefix: '',
        description: '',
        divisionId: 0,
      });
      setPrefixManuallyEdited(false);
      setHasUnsavedChanges(false);
      setPrefixError('');
      setCreatedTicketSpaceId(null);
      setUpdatedTicketSpaceId(null);
      setUpdatedTicketSpaceId(null);
      loadFormData();
    }
  }, [open, type, id]);

  const loadFormData = async () => {
    setIsInitializing(true);
    try {
      // Get active company from localStorage
      const activeCompany = JSON.parse(localStorage.getItem('active_company') || '{}');

      if (activeCompany?.companyId) {
        setActiveCompanyId(activeCompany.companyId);
        // Load divisions for the active company
        await loadDivisions(activeCompany.companyId);
      } else {
        toast.error('No active company found. Please select a company');
      }

      // If editing, load existing data AFTER divisions are loaded
      if (type === 'edit' && id) {
        try {
          const { getTicketSpaceById } = await import('@/services/ticket-management/ticket-space.service');
          const response = await getTicketSpaceById(id);
          const ticketSpace = response.data;

          // Populate form with existing data
          form.reset({
            name: ticketSpace.name,
            prefix: ticketSpace.prefix,
            description: ticketSpace.description || '',
            divisionId: ticketSpace.divisionId,
          });

          setPrefixManuallyEdited(true); // Prevent prefix auto-generation in edit mode
        } catch (error) {
          console.error('Error loading ticket space:', error);
          toast.error('Failed to load ticket space data');
        }
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadDivisions = async (companyId: number) => {
    if (companyId === null || companyId === undefined) return;

    setIsDivisionLoading(true);
    try {
      const { getAllDivisionsByCompanyId } = await import('@/services/company-management/division-services');
      const response = await getAllDivisionsByCompanyId(companyId);
      const divisionsData = response.data || [];

      setDivisions(divisionsData);
      if (divisionsData.length === 1 && type === 'create') {
        const divisionId = divisionsData[0].id;
        form.setValue('divisionId', divisionId, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
        // Force trigger validation
        form.trigger('divisionId');
      }
    } catch (error) {
      console.error('Error loading divisions:', error);
      toast.error('Failed to load divisions');
      setDivisions([]);
    } finally {
      setIsDivisionLoading(false);
    }
  };

  const checkPrefixExists = async (prefix: string) => {
    if (!prefix || !activeCompanyId || prefix.length === 0) {
      setPrefixError('');
      return false;
    }

    setIsPrefixChecking(true);
    try {
      const { checkPrefixExists: checkPrefix } = await import('@/services/ticket-management/ticket-space.service');

      let currentPrefix = prefix.toUpperCase();
      let response = await checkPrefix(activeCompanyId, currentPrefix);

      if (response.data.exists && !prefixManuallyEdited) {
        const nameVal = form.getValues('name');
        if (nameVal) {
          const { generatePrefixAlternatives } = await import('@/lib/prefix-generator');
          const alts = generatePrefixAlternatives(nameVal);
          for (const alt of alts) {
            if (alt === currentPrefix) continue;
            response = await checkPrefix(activeCompanyId, alt);
            if (!response.data.exists) {
              currentPrefix = alt;
              form.setValue('prefix', currentPrefix);
              break;
            }
          }
        }
      }

      if (response.data.exists) {
        setPrefixError('Prefix already taken in this company');
        return true;
      } else {
        setPrefixError('');
        return false;
      }
    } catch (error) {
      console.error('Error checking prefix:', error);
      setPrefixError('');
      return false;
    } finally {
      setIsPrefixChecking(false);
    }
  };


  // Watch name field and auto-generate prefix
  const watchedName = form.watch('name');
  useEffect(() => {
    if (!prefixManuallyEdited && watchedName && type === 'create') {
      const newPrefix = generatePrefix(watchedName);
      form.setValue('prefix', newPrefix);
    }
  }, [watchedName, prefixManuallyEdited, type]);

  // Watch prefix field and validate
  const watchedPrefix = form.watch('prefix');
  useEffect(() => {
    if (watchedPrefix && activeCompanyId && type === 'create') {
      const timeoutId = setTimeout(() => {
        checkPrefixExists(watchedPrefix);
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [watchedPrefix, activeCompanyId, type]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && !isSubmitting) {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, isSubmitting]);

  // Debug: Watch divisionId changes
  const watchedDivisionId = form.watch('divisionId');
  useEffect(() => {
  }, [watchedDivisionId]);

  const handleSubmit = async (values: TicketSpaceFormValues) => {
    // Check prefix only when creating (not when editing)
    if (type === 'create') {
      if (prefixError) {
        toast.error('Please fix the prefix error before submitting');
        return;
      }

      const prefixExists = await checkPrefixExists(values.prefix);
      if (prefixExists) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Add companyId to the values from active company
      const submitData = {
        ...values,
        companyId: activeCompanyId,
        prefix: values.prefix.toUpperCase(),
      };

      if (type === 'create') {
        const { createTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
        const response = await createTicketSpace(submitData);
        setCreatedTicketSpaceId(response.data.id);
        toast.success('Ticket space created');
        setHasUnsavedChanges(false);
        if (onUpdate) onUpdate(response.data, 'create');
      } else {
        const { updateTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
        const response = await updateTicketSpace(id!, submitData);
        setUpdatedTicketSpaceId(id!);
        toast.success('Ticket space updated');
        setHasUnsavedChanges(false);
        // For edit, use the response data or merge with submitData
        if (onUpdate) onUpdate(response.data || { ...submitData, id }, 'edit');
      }
    } catch (error: any) {
      console.error('ERROR in handleSubmit:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || 'Failed to save ticket space';
      toast.error(errorMessage);
      console.error('Error saving ticket space:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges && !isSubmitting) {
      // User is trying to close with unsaved changes
      setShowUnsavedWarning(true);
    } else if (!open) {
      // No unsaved changes or form was submitted, close normally
      form.reset({ name: '', prefix: '', description: '', divisionId: 0 });
      setPrefixManuallyEdited(false);
      setHasUnsavedChanges(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      form.reset({ name: '', prefix: '', description: '', divisionId: 0 });
      setPrefixManuallyEdited(false);
      setHasUnsavedChanges(false);
      onOpenChange(false);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    form.reset({ name: '', prefix: '', description: '', divisionId: 0 });
    setPrefixManuallyEdited(false);
    onOpenChange(false);
  };

  const handleContinueEditing = () => {
    setShowUnsavedWarning(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {type === 'create' ? 'Create Ticket Space' : 'Edit Ticket Space'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              id={FORM_ID}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter ticket space name"
                        disabled={isInitializing || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prefix */}
              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefix *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., CS"
                        disabled={isInitializing || isSubmitting || type === 'edit'}
                        className={prefixError ? 'border-destructive' : ''}
                        onChange={(e) => {
                          const uppercase = e.target.value.substring(0, 4).toUpperCase();
                          field.onChange({ target: { value: uppercase } });
                          setPrefixManuallyEdited(true);
                        }}
                        maxLength={4}
                      />
                    </FormControl>
                    {type === 'edit' ? (
                      <FormDescription>
                        Prefix cannot be changed after creation
                      </FormDescription>
                    ) : (
                      <>
                        {isPrefixChecking && (
                          <FormDescription className="text-muted-foreground">
                            Checking prefix availability...
                          </FormDescription>
                        )}
                        {!isPrefixChecking && prefixError && (
                          <FormDescription className="text-destructive">
                            {prefixError}
                          </FormDescription>
                        )}
                        {!isPrefixChecking && !prefixError && (
                          <FormDescription>
                            Auto-generated from name, but you can customize it
                          </FormDescription>
                        )}
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter description"
                        disabled={isInitializing || isSubmitting}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Division */}
              <FormField
                control={form.control}
                name="divisionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const numValue = Number(value);
                        field.onChange(numValue);
                      }}
                      value={field.value && field.value > 0 ? String(field.value) : ""}
                      disabled={isInitializing || isSubmitting || isDivisionLoading || divisions.length === 1 || type === 'edit'}
                    >
                      <FormControl>
                        <SelectTrigger className={field.value && field.value > 0 ? "" : ""}>
                          <SelectValue placeholder={
                            isDivisionLoading
                              ? "Loading divisions..."
                              : "Select division"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {divisions.length > 0 ? (
                          divisions.map((division: any) => (
                            <SelectItem
                              key={division.id}
                              value={String(division.id)}
                            >
                              {division.division}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {isDivisionLoading ? 'Loading divisions' : 'No divisions available'}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {type === 'edit' ? (
                      <FormDescription>
                        Division cannot be changed after creation
                      </FormDescription>
                    ) : (
                      <>
                        {divisions.length === 1 && field.value > 0 && (
                          <FormDescription>
                            Auto-selected (you have only one division)
                          </FormDescription>
                        )}
                        {divisions.length > 1 && (
                          <FormDescription>
                            Division for this ticket space based on your active company
                          </FormDescription>
                        )}
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter>
            {(createdTicketSpaceId || updatedTicketSpaceId) ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({ name: '', prefix: '', description: '', divisionId: 0 });
                    setCreatedTicketSpaceId(null);
                    setUpdatedTicketSpaceId(null);
                    onOpenChange(false);
                  }}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const spaceId = createdTicketSpaceId || updatedTicketSpaceId;
                    if (spaceId) {
                      router.push(`/ticket-management/ticket-space/configure/${spaceId}`);
                      onOpenChange(false);
                    }
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Open Configuration
                </Button>
              </>
            ) : (
              // Show normal Create/Update buttons
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form={FORM_ID}
                  className="gap-1.5"
                  disabled={
                    isSubmitting ||
                    isInitializing ||
                    (type === 'create' && (!!prefixError || isPrefixChecking))
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting
                    ? 'Saving...'
                    : type === 'create'
                      ? 'Create'
                      : 'Update'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedWarning}
        onOpenChange={setShowUnsavedWarning}
        onConfirmLeave={handleConfirmLeave}
        onContinueEditing={handleContinueEditing}
      />
    </>
  );
}

