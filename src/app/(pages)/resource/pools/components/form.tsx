'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom'; // Using standard Portal
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Check, Loader2, Plus, Save } from 'lucide-react';

// UI Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Services
import { getAllDivisionsByCompanyId } from '@/services/division-services';
import { findAllUsersByCompanyAndDivision } from '@/services/user-service';
import { getAllResourceByCompany } from '@/services/resource-service';
import { createResourcePool, editResourcePool, getById } from '@/services/resource-pool-service';

// Custom Components
import ResourceSelector from '@/components/common/ResourceSelector';
import { Resource } from '@/interfaces/resource';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Pool name is required.' }),
  company: z.coerce.number().int(),
  division: z.coerce.number().int().min(1, { message: 'Division is required' }),
  pool_owner: z.coerce.number().int().min(1, { message: 'Owner is required' }),
  resources: z.array(z.number().int()).min(1, { message: 'Select at least one resource.' }),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Owner Selector (search-based, styled like ResourceSelector) ──────────
function OwnerSelector({
  owners,
  selectedOwnerId,
  onChange,
  disabled,
}: {
  owners: any[];
  selectedOwnerId: number;
  onChange: (id: number) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOwner = owners.find((o) => o.id === selectedOwnerId);

  const filteredOwners = useMemo(() => {
    if (!searchQuery.trim()) return owners;
    const query = searchQuery.toLowerCase();
    return owners.filter(
      (o) =>
        o.first_name?.toLowerCase().includes(query) ||
        o.last_name?.toLowerCase().includes(query) ||
        o.email?.toLowerCase().includes(query),
    );
  }, [owners, searchQuery]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSearchQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={`flex items-center gap-2.5 w-full text-left rounded-md transition-colors p-1 -m-1 focus:outline-none group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50'
            }`}
          title={selectedOwner ? `${selectedOwner.first_name} ${selectedOwner.last_name}` : 'Click to assign'}
        >
          {selectedOwner ? (
            <>
              <Avatar className="h-8 w-8 flex-shrink-0 group-hover:ring-2 group-hover:ring-primary/50 transition-shadow">
                <AvatarImage src={selectedOwner.profile_picture || selectedOwner.profile_pic || ''} alt={`${selectedOwner.first_name} ${selectedOwner.last_name}`} />
                <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                  {selectedOwner.first_name?.charAt(0)}{selectedOwner.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate leading-tight">
                  {selectedOwner.first_name} {selectedOwner.last_name}
                </div>
                {selectedOwner.email && (
                  <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{selectedOwner.email}</div>
                )}
              </div>
            </>
          ) : (
            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                <Plus className="w-3.5 h-3.5" />
              </AvatarFallback>
            </Avatar>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 flex flex-col z-[9999]"
        style={{ height: 'min(360px, var(--radix-popover-content-available-height, 360px))' }}
        align="start"
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={12}
      >
        <Command shouldFilter={false} className="flex flex-col flex-1 overflow-hidden">
          <CommandInput
            placeholder="Search by name or email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-none focus:ring-0"
          />
          <CommandList className="flex-1 max-h-none overflow-y-auto">
            {filteredOwners.length === 0 ? (
              <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                No owners found
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Owners">
                {filteredOwners.map((o) => (
                  <CommandItem
                    key={o.id}
                    onSelect={() => {
                      onChange(o.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 py-2 px-3 cursor-pointer mb-1"
                  >
                    <Avatar className="h-8 w-8 bg-primary/10">
                      <AvatarImage src={o.profile_picture || o.profile_pic || ''} />
                      <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                        {((o.first_name?.[0] || '') + (o.last_name?.[0] || '')).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {o.first_name} {o.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate leading-tight">
                        {o.email}
                      </p>
                    </div>
                    {o.id === selectedOwnerId && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ResourcePoolFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResourceUpdate: () => void;
  type: 'create' | 'edit';
  resourceId?: number;
}

export default function ResourcePoolFormModal({
  open,
  onOpenChange,
  onResourceUpdate,
  type,
  resourceId,
}: ResourcePoolFormProps) {
  const [loggedCompany, setLoggedCompany] = useState<{ companyId: number } | null>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [poolOwners, setPoolOwners] = useState<any[]>([]);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [mounted, setMounted] = useState(false);

  const [loadingStates, setLoadingStates] = useState({
    main: false,
    divisions: false,
    dependencies: false,
    submitting: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', company: 0, division: 0, pool_owner: 0, resources: [] },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem('active_company');
    if (stored) {
      const parsed = JSON.parse(stored);
      setLoggedCompany(parsed);
      form.setValue('company', parsed.companyId);
      loadDivisions(parsed.companyId);
    }
    if (type === 'edit' && resourceId) {
      loadPoolData(resourceId);
    } else {
      form.reset({
        name: '',
        company: JSON.parse(stored || '{}').companyId || 0,
        division: 0,
        pool_owner: 0,
        resources: [],
      });
      setPoolOwners([]);
      setAvailableResources([]);
    }
  }, [open, type, resourceId]);

  const loadDivisions = async (companyId: number) => {
    setLoadingStates(prev => ({ ...prev, divisions: true }));
    try {
      const response = await getAllDivisionsByCompanyId(companyId);
      const divs = response.data || response;
      setDivisions(divs);

      // Auto-select division if creating and there's only 1 division
      if (type === 'create' && divs && divs.length === 1) {
        const divId = divs[0].id;
        form.setValue('division', divId);
        loadDependencies(divId, companyId);
      }
    } catch (e) {
      toast.error('Failed to load divisions');
    } finally {
      setLoadingStates(prev => ({ ...prev, divisions: false }));
    }
  };

  const loadDependencies = async (divisionId: number, companyId: number) => {
    if (!divisionId || companyId === null || companyId === undefined) return;
    setLoadingStates(prev => ({ ...prev, dependencies: true }));
    try {
      const [ownersRes, resourcesRes] = await Promise.all([
        findAllUsersByCompanyAndDivision(companyId, divisionId),
        getAllResourceByCompany(companyId, divisionId),
      ]);
      setPoolOwners(ownersRes.data || ownersRes);
      setAvailableResources(resourcesRes.data || resourcesRes);
    } catch (e) {
      toast.error('Failed to load dependencies');
    } finally {
      setLoadingStates(prev => ({ ...prev, dependencies: false }));
    }
  };

  const loadPoolData = async (id: number) => {
    setLoadingStates(prev => ({ ...prev, main: true }));
    try {
      const response = await getById(id);
      const poolData = response.data || response;
      const companyId = poolData.company?.id || loggedCompany?.companyId;
      const divisionId = poolData.division?.id;

      if (divisionId && companyId) {
        await loadDependencies(divisionId, companyId);
        form.reset({
          name: poolData.name,
          company: companyId,
          division: divisionId,
          pool_owner: poolData.pool_owner?.id || 0,
          resources: poolData.resources?.map((r: any) => r.id) || [],
        });
      }
    } catch (error) {
      toast.error('Failed to load pool data');
    } finally {
      setLoadingStates(prev => ({ ...prev, main: false }));
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoadingStates(prev => ({ ...prev, submitting: true }));
    try {
      if (type === 'create') await createResourcePool(values);
      else if (resourceId) await editResourcePool(resourceId, values);
      toast.success(`Resource group ${type === 'create' ? 'created' : 'updated'}`);
      onResourceUpdate();
      onOpenChange(false);
    } catch (error) {
      toast.error('Operation failed');
    } finally {
      setLoadingStates(prev => ({ ...prev, submitting: false }));
    }
  };

  if (!open || !mounted) return null;

  // Custom Modal implementation using createPortal to avoid Shadcn Dialog logic
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white dark:bg-slate-950 w-full max-w-[600px] max-h-[90vh] rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 sticky top-0 rounded-t-xl bg-white dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xl font-semibold text-slate-900 dark:text-foreground">
                {type === 'create' ? 'Create Resource Group' : 'Edit Resource Group'}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-transparent">
          {loadingStates.main ? (
            <div className="flex justify-center p-8">Loading...</div>
          ) : (
            <Form {...form}>
              <form id="resource-pool-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g. Engineering Pool" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField
                    control={form.control}
                    name="division"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Division <span className="text-red-500">*</span></FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : ''}
                          onValueChange={(val) => {
                            const id = parseInt(val);
                            field.onChange(id);
                            form.setValue('pool_owner', 0);
                            form.setValue('resources', []);
                            if (loggedCompany) loadDependencies(id, loggedCompany.companyId);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger
                              // Add this to ensure the click works inside a custom portal
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <SelectValue placeholder="Select Division" />
                            </SelectTrigger>
                          </FormControl>
                          {/* Important: Add position="popper" and a high z-index class */}
                          <SelectContent className="z-[200]" position="popper">
                            {divisions.map((d) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {d.division}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pool_owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <div onMouseDownCapture={(e) => e.stopPropagation()}>
                            <OwnerSelector
                              owners={poolOwners}
                              selectedOwnerId={field.value}
                              onChange={(id) => field.onChange(id)}
                              disabled={!form.getValues('division')}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="resources" render={({ field }) => {
                    const selectedItems = availableResources.filter(res => field.value.includes(res.id || (res as any).resourceId));
                    const divisionSelected = !!form.getValues('division');
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          Members <span className="text-red-500">*</span>
                          {selectedItems.length > 0 && (
                            <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{selectedItems.length}</span>
                          )}
                        </FormLabel>

                        <FormControl>
                          <div
                            onMouseDownCapture={(e) => e.stopPropagation()}
                            className="flex items-center flex-wrap gap-y-1"
                          >
                            {/* + button always first — stable, never moves */}
                            <div className="w-fit shrink-0">
                              <ResourceSelector
                                selectedResources={selectedItems}
                                onChange={(resources) => {
                                  const ids = resources.map(r => r.id || (r as any).resourceId);
                                  field.onChange(ids);
                                }}
                                mode="multi"
                                showAllTabs={true}
                                disabled={!divisionSelected}
                                showResourceGroups={false}
                                triggerElement={
                                  <button
                                    type="button"
                                    className="focus:outline-none relative z-30 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="Add resource"
                                    disabled={!divisionSelected}
                                  >
                                    <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
                                      <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                                        <Plus className="w-3.5 h-3.5" />
                                      </AvatarFallback>
                                    </Avatar>
                                  </button>
                                }
                              />
                            </div>
                            {selectedItems.map((res, i) => {
                              const resId = res.id || (res as any).resourceId;
                              return (
                                <button
                                  key={resId}
                                  type="button"
                                  onClick={() => field.onChange(field.value.filter((id: number) => id !== resId))}
                                  className="focus:outline-none relative -ml-2"
                                  style={{ zIndex: 20 - i }}
                                  title={`${res.first_name} ${res.last_name} - click to remove`}
                                >
                                  <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:ring-destructive/60 hover:opacity-80 transition-all">
                                    <AvatarImage src={res.profile_pic} alt={`${res.first_name} ${res.last_name}`} />
                                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                                      {res.first_name?.charAt(0)}{res.last_name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }} />
                </div>

              </form>
            </Form>

          )}
        </div>

        {/* Fotter */}
        <div className="flex items-center justify-end gap-2 px-6 pb-6 flex-shrink-0 rounded-b-xl">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="resource-pool-form" disabled={loadingStates.submitting}>
            {loadingStates.submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loadingStates.submitting ? 'Processing' : type === 'create' ? 'Create' : 'Update'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}