'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { generatePrefix } from '@/lib/prefix-generator';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useRouter } from 'next/navigation';
import { Settings, Loader2, Save } from 'lucide-react';

interface TaskSpaceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (space: any, action: 'create' | 'edit') => void;
  type: 'create' | 'edit';
  id?: number;
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  prefix: z.string().min(1, { message: 'Prefix is required' }),
  description: z.string().optional(),
  divisionId: z.coerce.number().int().positive({ message: 'Division is required' }),
});

type FormValues = z.infer<typeof formSchema>;

export function TaskSpaceForm({ open, onOpenChange, onUpdate, type, id }: TaskSpaceFormProps) {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [prefixManuallyEdited, setPrefixManuallyEdited] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<number>(0);
  const [prefixError, setPrefixError] = useState('');
  const [isPrefixChecking, setIsPrefixChecking] = useState(false);
  const [createdTaskSpaceId, setCreatedTaskSpaceId] = useState<number | null>(null);
  const [updatedTaskSpaceId, setUpdatedTaskSpaceId] = useState<number | null>(null);
  const router = useRouter();


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', prefix: '', description: '', divisionId: 0 },
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: '', prefix: '', description: '', divisionId: 0 });
      setPrefixManuallyEdited(false);
      setHasUnsavedChanges(false);
      setPrefixError('');
      setCreatedTaskSpaceId(null);
      setUpdatedTaskSpaceId(null);
      loadFormData();
    }
  }, [open, type, id]);

  const loadFormData = async () => {
    setIsInitializing(true);
    try {
      const activeCompany = JSON.parse(localStorage.getItem('active_company') || '{}');
      if (activeCompany?.companyId) {
        setActiveCompanyId(activeCompany.companyId);
        await loadDivisions(activeCompany.companyId);
      } else {
        toast.error('No active company found. Please select a company');
      }

      if (type === 'edit' && id) {
        const { getTaskSpaceById } = await import('@/services/task-management/task-space.service');
        const response = await getTaskSpaceById(id);
        const space = response.data;
        form.reset({
          name: space.name,
          prefix: space.prefix,
          description: space.description || '',
          divisionId: space.divisionId,
        });
        setPrefixManuallyEdited(true);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadDivisions = async (companyId: number) => {
    try {
      const { getAllDivisionsByCompanyId } = await import('@/services/company-management/division-services');
      const response = await getAllDivisionsByCompanyId(companyId);
      const data = response.data || [];
      setDivisions(data);
      if (data.length === 1 && type === 'create') {
        form.setValue('divisionId', data[0].id, { shouldValidate: true, shouldDirty: true });
      }
    } catch {
      toast.error('Failed to load divisions');
    }
  };

  const checkPrefix = async (prefix: string) => {
    if (!prefix || !activeCompanyId) { setPrefixError(''); return false; }
    setIsPrefixChecking(true);
    try {
      const { checkTaskSpacePrefixExists } = await import('@/services/task-management/task-space.service');

      let currentPrefix = prefix.toUpperCase();
      let response = await checkTaskSpacePrefixExists(activeCompanyId, currentPrefix);

      if (response.data.exists && !prefixManuallyEdited) {
        const nameVal = form.getValues('name');
        if (nameVal) {
          const { generatePrefixAlternatives } = await import('@/lib/prefix-generator');
          const alts = generatePrefixAlternatives(nameVal);
          for (const alt of alts) {
            if (alt === currentPrefix) continue;
            response = await checkTaskSpacePrefixExists(activeCompanyId, alt);
            if (!response.data.exists) {
              currentPrefix = alt;
              form.setValue('prefix', currentPrefix);
              break;
            }
          }
        }
      }

      if (response.data.exists) { setPrefixError('Prefix already taken in this company'); return true; }
      setPrefixError(''); return false;
    } catch { setPrefixError(''); return false; }
    finally { setIsPrefixChecking(false); }
  };

  const watchedName = form.watch('name');
  useEffect(() => {
    if (!prefixManuallyEdited && watchedName && type === 'create')
      form.setValue('prefix', generatePrefix(watchedName));
  }, [watchedName, prefixManuallyEdited, type]);

  const watchedPrefix = form.watch('prefix');
  useEffect(() => {
    if (watchedPrefix && activeCompanyId && type === 'create') {
      const t = setTimeout(() => checkPrefix(watchedPrefix), 800);
      return () => clearTimeout(t);
    }
  }, [watchedPrefix, activeCompanyId, type]);

  useEffect(() => {
    const sub = form.watch((_, { name }) => { if (name && !isSubmitting) setHasUnsavedChanges(true); });
    return () => sub.unsubscribe();
  }, [form.watch, isSubmitting]);

  const handleSubmit = async (values: FormValues) => {
    if (type === 'create') {
      if (prefixError) { toast.error('Please fix the prefix error before submitting'); return; }
      if (await checkPrefix(values.prefix)) return;
    }
    setIsSubmitting(true);
    try {
      const submitData: any = { ...values, companyId: activeCompanyId, prefix: values.prefix.toUpperCase() };
      if (type === 'create') {
        const { createTaskSpace } = await import('@/services/task-management/task-space.service');
        const response = await createTaskSpace(submitData);
        toast.success('Space created');
        setHasUnsavedChanges(false);
        setCreatedTaskSpaceId(response.data.id);
        onUpdate?.(response.data, 'create');
      } else {
        const { updateTaskSpace } = await import('@/services/task-management/task-space.service');
        const response = await updateTaskSpace(id!, submitData);
        toast.success('Space updated');
        setHasUnsavedChanges(false);
        setUpdatedTaskSpaceId(id!);
        onUpdate?.(response.data || { ...submitData, id }, 'edit');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save space');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) { setShowUnsavedWarning(true); return; }
    onOpenChange(open);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{type === 'create' ? 'Create Project Space' : 'Edit Project Space'}</DialogTitle>
          </DialogHeader>

          {isInitializing ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form id="task-space-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g. Engineering Tasks" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="prefix" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefix <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. ENG"
                        {...field}
                        disabled={type === 'edit'}
                        onChange={(e) => {
                          const uppercase = e.target.value.substring(0, 4).toUpperCase();
                          setPrefixManuallyEdited(true);
                          field.onChange(uppercase);
                        }}
                        maxLength={4}
                        className={prefixError ? 'border-red-500' : ''}
                      />
                    </FormControl>
                    {type === 'edit' ? (
                      <FormDescription>Prefix cannot be changed after creation</FormDescription>
                    ) : (
                      <>
                        {isPrefixChecking && <FormDescription className="text-muted-foreground">Checking prefix availability...</FormDescription>}
                        {!isPrefixChecking && prefixError && <FormDescription className="text-destructive">{prefixError}</FormDescription>}
                        {!isPrefixChecking && !prefixError && <FormDescription>Auto-generated from name, but you can customize it</FormDescription>}
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="divisionId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : ''}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a division" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {divisions.map((div) => (
                          <SelectItem key={div.id} value={String(div.id)}>{div.division}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Optional description..." rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>
          )}

          <DialogFooter>
            {(createdTaskSpaceId || updatedTaskSpaceId) ? (
              <>
                <Button type="button" variant="outline" onClick={() => { setCreatedTaskSpaceId(null); setUpdatedTaskSpaceId(null); onOpenChange(false); }}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const spaceId = createdTaskSpaceId || updatedTaskSpaceId;
                    if (spaceId) { router.push(`/task-management/task-space/configure/${spaceId}`); onOpenChange(false); }
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Open Configuration
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" form="task-space-form" className="gap-1.5" disabled={isSubmitting || isInitializing || !!prefixError}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? 'Saving' : type === 'create' ? 'Create' : 'Update'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedWarning}
        onOpenChange={setShowUnsavedWarning}
        onConfirmLeave={() => { setShowUnsavedWarning(false); setHasUnsavedChanges(false); onOpenChange(false); }}
        onContinueEditing={() => setShowUnsavedWarning(false)}
      />
    </>
  );
}

