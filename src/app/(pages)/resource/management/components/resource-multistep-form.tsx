import { useEffect, useState, useCallback } from 'react';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trash2, Plus, ArrowLeft, Save, Camera, User, ChevronDown, CheckCircle2, Loader2,
  Shapes,
  DollarSign,
  Check,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from "@/components/ui/calendar";

interface SearchableSelectProps {
  options: { id: number; name: string }[];
  value?: number;
  onChange: (value: number) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Search...",
  disabled = false,
  emptyText = "No options found.",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-9 w-full justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent shadow-none hover:bg-slate-50 dark:hover:bg-slate-900/20 focus:ring-1 text-slate-900 dark:text-slate-100 text-sm px-3 font-normal"
        >
          <span className="truncate">
            {selectedOption ? selectedOption.name : <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>}
          </span>
          <ChevronDown className="ml-1.5 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 z-[9999]" align="start" sideOffset={4}>
        <Command shouldFilter={true}>
          <CommandInput placeholder={searchPlaceholder} className="h-9 border-none focus:ring-0 text-xs" />
          <CommandList className="max-h-[200px] overflow-y-auto p-1">
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = value === opt.id;
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between py-1.5 px-2.5 text-xs cursor-pointer rounded-sm"
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const RATE_TYPES = [
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_hour', label: 'Per Hour' }
];
import { toast } from 'sonner';

// Services
import { loadDivisions } from '@/services/company-management/division-services';
import { loadCalendars, getAllCalendarDays } from '@/services/resource-management/calendar-services';
import { loadSkill_level, loadSkillCategories, loadSkills } from '@/services/resource-management/skill-services';
import { createResource, findOneResource, updateResource, getAllResourcesByCompanyOnly, checkResourceEmail } from '@/services/resource-management/resource-service';
import { searchUserByEmail } from '@/services/user-management/user-service';
import { getAllCurrencies } from '@/services/resource-management/currency.service';

const formSchema = z.object({
  first_name: z.string().min(1, 'First Name is required'),
  last_name: z.string().min(1, 'Last Name is required'),
  email: z.string().email('Invalid email address'),
  working_hours: z.coerce.number().min(1, 'Required'),
  mobile: z.string().min(1, 'Phone number is required'),
  profile_pic: z.any().optional(),
  division: z.coerce.number().min(1, 'Division is required'),
  calendar: z.coerce.number().min(1, 'Calendar is required'),
  skills: z.array(z.object({
    skillCategoryId: z.number(),
    skillId: z.number(),
    skillLevelId: z.number(),
  })).optional().default([]),
  resourceCost: z.object({
    cost: z.coerce.number().optional().nullable(),
    currencyId: z.coerce.number().optional().nullable(),
    rate_type: z.string().optional().nullable(),
  }).optional(),
  active_status: z.boolean().default(false),
  type: z.enum(['Internal', 'External']).default('Internal'),
  reportingPersonId: z.preprocess((val) => (val === '' || val === 'null' || val === undefined || val === null ? null : Number(val)), z.number().nullable().optional()),
  update_all_under_old_reporting_person: z.boolean().optional().default(false),
});

type FormValues = z.infer<typeof formSchema>;

type EmailCheckStatus = 'idle' | 'checking' | 'exists_in_resource' | 'prefilled_from_user' | 'not_found';

export function ResourceMultiStepForm({ open, onOpenChange, onResourceUpdate, type, resourceId }: any) {
  const canEditResource = usePrivilegeGuard("40") as boolean;
  const [step, setStep] = useState(1);
  const [skillPage, setSkillPage] = useState(1);
  const [activeTab, setActiveTab] = useState("skills");
  const [loggedCompany, setLoggedCompany] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reportingPopoverOpen, setReportingPopoverOpen] = useState(false);

  // Audit & Calendar state
  const [auditInfo, setAuditInfo] = useState<{ createdBy?: string, createdAt?: Date, updatedBy?: string, updatedAt?: Date } | null>(null);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Email check state (create mode only)
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>('idle');

  // Data Stores
  const [divisions, setDivisions] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [skillCategories, setSkillCategories] = useState<any[]>([]);
  const [skillsByCategory, setSkillsByCategory] = useState<Record<number, any[]>>({});
  const [skillLevelsByCategory, setSkillLevelsByCategory] = useState<Record<number, any[]>>({});
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [initialReportingPersonId, setInitialReportingPersonId] = useState<number | null>(null);
  const [initialReportingPersonName, setInitialReportingPersonName] = useState<string>('');

  const [loadingStates, setLoadingStates] = useState({
    main: false,
    dropdowns: false,
    submitting: false
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      mobile: '',
      working_hours: 8,
      division: undefined,
      calendar: undefined,
      skills: [],
      resourceCost: { cost: undefined, currencyId: undefined, rate_type: 'per_day' },
      active_status: false,
      reportingPersonId: null,
      update_all_under_old_reporting_person: false,
      type: 'Internal',
    },
  });

  const { fields, append, prepend, remove } = useFieldArray({ control: form.control, name: 'skills' });
  const watchedSkills = useWatch({ control: form.control, name: 'skills' });
  const watchedReportingPersonId = useWatch({ control: form.control, name: 'reportingPersonId' });
  const watchedCalendarId = useWatch({ control: form.control, name: 'calendar' });

  useEffect(() => {
    if (watchedCalendarId) {
      getAllCalendarDays(watchedCalendarId)
        .then((res) => {
          const parsed = res.data.map((d: any) => ({
            ...d,
            date: new Date(d.date),
          }));
          setCalendarDays(parsed);
        })
        .catch(() => {
          toast.error("Failed to load calendar days");
        });
    } else {
      setCalendarDays([]);
    }
  }, [watchedCalendarId, currentMonth]);

  // --- Data Fetching Logic ---
  const fetchDropdownData = useCallback(async (companyId: number) => {
    setLoadingStates(prev => ({ ...prev, dropdowns: true }));
    try {
      const filter = [
        { field: 'companyId', value: companyId, matchMode: 'equals' },
        { field: 'isActive', value: true, matchMode: 'equals' }
      ];

      const [divRes, calRes, catRes, currRes, resRes] = await Promise.all([
        loadDivisions({ filters: filter, first: 0, rows: 1000 }),
        loadCalendars({ filters: filter, first: 0, rows: 1000 }),
        loadSkillCategories({ filters: filter, first: 0, rows: 1000 }),
        getAllCurrencies(),
        getAllResourcesByCompanyOnly(companyId)
      ]);

      setDivisions(divRes.data || []);
      setCalendars(calRes.data || []);
      setSkillCategories(catRes.data || []);
      setCurrencies(currRes.data || []);

      const resList = resRes.data ?? resRes;
      setResources(Array.isArray(resList) ? resList : (resList?.data || []));
    } catch (error) {
      toast.error("Failed to load setup data");
    } finally {
      setLoadingStates(prev => ({ ...prev, dropdowns: false }));
    }
  }, []);

  useEffect(() => {
    const selectedCompany = JSON.parse(localStorage.getItem('active_company') || 'null');
    if (selectedCompany) {
      setLoggedCompany(selectedCompany);
      if (open) fetchDropdownData(selectedCompany.companyId);
    }
  }, [open, fetchDropdownData]);

  // Auto select division if only one exists
  useEffect(() => {
    if (divisions.length === 1 && !form.getValues('division')) {
      form.setValue('division', divisions[0].id, { shouldValidate: true });
    }
  }, [divisions, form]);

  // Auto select calendar if only one exists
  useEffect(() => {
    if (calendars.length === 1 && !form.getValues('calendar')) {
      form.setValue('calendar', calendars[0].id, { shouldValidate: true });
    }
  }, [calendars, form]);

  useEffect(() => {
    if (open && type === 'edit' && resourceId) {
      loadResourceData(resourceId);
    } else if (open && type === 'create') {
      form.reset();
      setPreviewUrl(null);
      setStep(1);
      setInitialReportingPersonId(null);
      setInitialReportingPersonName('');
      setEmailCheckStatus('idle');
    }
  }, [open, type, resourceId]);

  // --- Email check on blur (create mode only) ---
  const handleEmailBlur = useCallback(async (email: string) => {
    if (type !== 'create') return;
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return;

    setEmailCheckStatus('checking');

    // Step 1: Check if email already exists in the resource table
    const resourceCheck = await checkResourceEmail(trimmedEmail);
    if (resourceCheck.exists) {
      setEmailCheckStatus('exists_in_resource');
      form.setError('email', {
        type: 'manual',
        message: `A resource with this email already exists (${resourceCheck.resource?.first_name} ${resourceCheck.resource?.last_name}).`,
      });
      return;
    }

    // Step 2: Check user table for same-company user to pre-fill details
    try {
      const userRes = await searchUserByEmail(trimmedEmail);
      const user = userRes?.data ?? userRes;
      if (user && user.id) {
        form.clearErrors('email');
        form.setValue('first_name', user.first_name || '', { shouldValidate: true });
        form.setValue('last_name', user.last_name || '', { shouldValidate: true });
        form.setValue('mobile', user.mobile_number ? String(user.mobile_number) : '', { shouldValidate: true });
        if (user.profile_picture) {
          setPreviewUrl(user.profile_picture);
          // Store the URL so it can be sent as a string reference (backend handles this)
          form.setValue('profile_pic', user.profile_picture);
        }
        setEmailCheckStatus('prefilled_from_user');
        toast.success('User found — profile details have been pre-filled');
      } else {
        form.clearErrors('email');
        setEmailCheckStatus('not_found');
      }
    } catch {
      form.clearErrors('email');
      setEmailCheckStatus('not_found');
    }
  }, [type, form]);

  const loadResourceData = async (id: number) => {
    setLoadingStates(p => ({ ...p, main: true }));
    try {
      const res = await findOneResource(id);
      const data = res.data;
      if (data.profile_pic) setPreviewUrl(data.profile_pic);

      setAuditInfo({
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedBy: data.updatedBy,
        updatedAt: data.updatedAt,
      });

      const mappedSkills = (data.skills || []).map((s: any) => ({
        skillCategoryId: s.skillCategory?.id,
        skillId: s.skill?.id,
        skillLevelId: s.level?.id || s.skillLevel?.id,
      }));

      const uniqueCategoryIds = Array.from(
        new Set(mappedSkills.map((s: any) => s.skillCategoryId).filter(Boolean))
      );

      uniqueCategoryIds.forEach((categoryId) => {
        triggerCategoryLoad(categoryId as number);
      });

      const repId = data.reportingPersonId || null;
      setInitialReportingPersonId(repId);
      if (data.reportingPerson) {
        setInitialReportingPersonName(`${data.reportingPerson.first_name} ${data.reportingPerson.last_name}`);
      } else {
        setInitialReportingPersonName('');
      }

      form.reset({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        mobile: data.mobile ? String(data.mobile) : '',
        working_hours: data.working_hours || 8,
        division: data.division?.id,
        calendar: data.calendar?.id,
        skills: mappedSkills,
        resourceCost: {
          cost: data.resourceCost?.cost || undefined,
          currencyId: data.resourceCost?.currency?.id || undefined,
          rate_type: data.resourceCost?.rate_type || 'per_day',
        },
        active_status: Boolean(data.active_status),
        type: data.type || 'Internal',
        reportingPersonId: repId,
        update_all_under_old_reporting_person: false,
      });
    } finally { setLoadingStates(p => ({ ...p, main: false })); }
  };

  const triggerCategoryLoad = async (categoryId: number) => {
    if (!categoryId || skillsByCategory[categoryId]) return;
    try {
      const [sRes, lRes] = await Promise.all([
        loadSkills({ filters: [{ field: 'categoryId', value: categoryId, matchMode: 'equals' }], first: 0, rows: 1000 }),
        loadSkill_level({ filters: [{ field: 'categoryId', value: categoryId, matchMode: 'equals' }], first: 0, rows: 1000 })
      ]);
      setSkillsByCategory(prev => ({ ...prev, [categoryId]: sRes.data }));
      setSkillLevelsByCategory(prev => ({ ...prev, [categoryId]: lRes.data }));
    } catch (e) { console.error(e); }
  };

  const handleFinalSubmit = async (values: FormValues) => {
    const rawSkills = values.skills || [];
    const validSkills = rawSkills.filter(
      (s) => (s.skillCategoryId && s.skillCategoryId > 0) || (s.skillId && s.skillId > 0) || (s.skillLevelId && s.skillLevelId > 0)
    );

    const incompleteSkill = validSkills.find(
      (s) => !s.skillCategoryId || !s.skillId || !s.skillLevelId || s.skillCategoryId <= 0 || s.skillId <= 0 || s.skillLevelId <= 0
    );

    if (incompleteSkill) {
      toast.error("Please select a category, specific skill, and proficiency level for all added skills");
      setStep(2);
      return;
    }

    const duplicateSkill = validSkills.find((skill, idx) => {
      return validSkills.some((otherSkill, otherIdx) =>
        idx !== otherIdx &&
        skill.skillCategoryId === otherSkill.skillCategoryId &&
        skill.skillId === otherSkill.skillId
      );
    });

    if (duplicateSkill) {
      const categoryName = skillCategories.find(c => c.id === duplicateSkill.skillCategoryId)?.name || "selected category";
      const skillName = (skillsByCategory[duplicateSkill.skillCategoryId] || []).find((s: any) => s.id === duplicateSkill.skillId)?.name || "selected skill";

      toast.error(`Duplicate skill: "${skillName}" in category "${categoryName}" has already been added`);
      setStep(2);
      return;
    }

    setLoadingStates(p => ({ ...p, submitting: true }));

    const formData = new FormData();
    formData.append('first_name', values.first_name);
    formData.append('last_name', values.last_name);
    formData.append('email', values.email);
    formData.append('mobile', values.mobile);
    formData.append('working_hours', values.working_hours.toString());
    formData.append('divisionId', values.division.toString());
    formData.append('calendarId', values.calendar.toString());
    formData.append('companyId', loggedCompany.companyId.toString());
    formData.append('active_status', values.active_status.toString());
    formData.append('type', values.type);

    if (values.reportingPersonId !== undefined && values.reportingPersonId !== null) {
      formData.append('reportingPersonId', values.reportingPersonId.toString());
    } else {
      formData.append('reportingPersonId', '0');
    }
    formData.append('update_all_under_old_reporting_person', String(values.update_all_under_old_reporting_person));

    const skillsData = validSkills.map(s => ({
      skillCategory: { id: s.skillCategoryId },
      skill: { id: s.skillId },
      skillLevel: { id: s.skillLevelId },
    }));
    formData.append('skills', JSON.stringify(skillsData));

    if (values.resourceCost && values.resourceCost.cost !== undefined && values.resourceCost.cost !== null) {
      formData.append('resourceCost', JSON.stringify({
        cost: values.resourceCost.cost,
        currencyId: values.resourceCost.currencyId,
        rate_type: values.resourceCost.rate_type || 'per_day'
      }));
    }

    if (values.profile_pic instanceof File) {
      formData.append('profile_pic', values.profile_pic);
    } else if (typeof values.profile_pic === 'string' && values.profile_pic) {
      formData.append('profile_pic_url', values.profile_pic);
    }

    try {
      const res = type === 'create' ? await createResource(formData) : await updateResource(resourceId!, formData);
      if (res.status === 200 || res.status === 201) {
        toast.success(`Resource ${type === 'create' ? 'created' : 'updated'}`);
        onResourceUpdate(res.data, type);
        onOpenChange(false);
      }
    } catch (e) {
      toast.error("Operation failed. Please check your data");
    } finally {
      setLoadingStates(p => ({ ...p, submitting: false }));
    }
  };
  const getDaysInMonth = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const formatDate = (date: Date, formatStr: string) => {
    try {
      if (formatStr === "MMMM yyyy") {
        return date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
      return date.toLocaleDateString();
    } catch (e) {
      return date.toDateString();
    }
  };

  const workingDates = calendarDays.filter((day) => day.isWorkingDay).map((day) => day.date);
  const workingDateStrings = new Set(workingDates.map((d) => d.toDateString()));
  const filteredHolidayDates = calendarDays.filter((day) => day.isHoliday && !workingDateStrings.has(day.date.toDateString())).map((day) => day.date);
  const filteredWeekendDates = calendarDays.filter((day) => day.isWeekend && !workingDateStrings.has(day.date.toDateString())).map((day) => day.date);

  const monthDays = getDaysInMonth(currentMonth);
  const monthStats = {
    totalDays: monthDays.length,
    workingDays: monthDays.filter((date) => workingDates.some((wd) => wd.toDateString() === date.toDateString())).length,
    holidays: monthDays.filter((date) => filteredHolidayDates.some((hd) => hd.toDateString() === date.toDateString())).length,
    weekends: monthDays.filter((date) => filteredWeekendDates.some((wd) => wd.toDateString() === date.toDateString())).length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[820px] overflow-hidden flex flex-col`}>
        <DialogHeader className="pb-0">
          <div className="flex items-center">
            <DialogTitle className="text-lg px-1.5">
              {type === 'create' ? 'Add New Resource' : 'Edit Resource Profile'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loadingStates.main ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-6">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                {/* Profile Section Skeleton */}
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex flex-col items-center gap-3 group">
                    <Skeleton className="h-[100px] w-[100px] rounded-full shrink-0" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4 w-full">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full" /></div>
                  </div>
                </div>

                {/* Additional Details Skeleton */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full" /></div>
                </div>

                {/* Toggles Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Skeleton className="h-[72px] w-full rounded-lg" />
                  <Skeleton className="h-[72px] w-full rounded-lg" />
                </div>
              </div>
            </div>

            {/* Footer Skeleton */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-end gap-3 mt-auto shrink-0">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="flex-1 flex flex-col overflow-hidden">

              <div className="flex-1 overflow-y-auto pt-2 pb-6 px-1">
                {step === 1 ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">

                    {/* Profile Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <FormField control={form.control} name="profile_pic" render={({ field }) => (
                        <div className="flex flex-col items-center gap-3 group">
                          <div className="relative">
                            <Avatar className="h-25 w-25 shadow-md">
                              <AvatarImage src={previewUrl || ""} className="object-cover" />
                              <AvatarFallback className="text-3xl font-semibold bg-primary text-white">
                                {form.watch("first_name") || form.watch("last_name") ? (
                                  `${(form.watch("first_name") || "").charAt(0)}${(form.watch("last_name") || "").charAt(0)}`.toUpperCase()
                                ) : (
                                  <User className="w-12 h-12" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              onClick={() => document.getElementById('pic')?.click()}
                              className="absolute bottom-0.5 right-0.5 p-1.5 ring-1 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          </div>
                          <Input type="file" id="pic" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) { field.onChange(file); setPreviewUrl(URL.createObjectURL(file)); }
                          }} />
                        </div>
                      )} />

                      <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="first_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="e.g. John" className="shadow-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="last_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="e.g. Doe" className="shadow-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="e.g. john.doe@company.com"
                                  className={`shadow-none ${type === 'edit' ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
                                  disabled={type === 'edit'}
                                  {...field}
                                  onBlur={(e) => {
                                    field.onBlur();
                                    if (type === 'create') handleEmailBlur(e.target.value);
                                  }}
                                />
                              </FormControl>
                              {type === 'create' && emailCheckStatus === 'checking' && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                              )}
                            </div>
                            <FormMessage />
                            {type === 'create' && emailCheckStatus === 'prefilled_from_user' && (
                              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Profile details pre-filled from existing user account.
                              </p>
                            )}
                            {type === 'edit' && (
                              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after creation.</p>
                            )}
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="mobile" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="e.g. +1 (555) 000-0000" className="shadow-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <FormField control={form.control} name="division" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="shadow-none">
                                {loadingStates.dropdowns ? <Loader2 className="w-4 h-4 animate-spin" /> : <SelectValue placeholder="Assign Division" />}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.division}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="calendar" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Calendar <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="shadow-none">
                                {loadingStates.dropdowns ? <Loader2 className="w-4 h-4 animate-spin" /> : <SelectValue placeholder="Assign Calendar" />}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>{calendars.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Searchable Command Popover Interface for Selecting Reporting Person */}
                      <FormField control={form.control} name="reportingPersonId" render={({ field }) => {
                        const selectedPerson = resources.find(r => r.id === field.value);
                        return (
                          <FormItem className="flex flex-col justify-end">
                            <FormLabel>Reporting Person</FormLabel>
                            <Popover open={reportingPopoverOpen} onOpenChange={setReportingPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between font-normal h-auto py-2 px-3 border border-input rounded-md text-left shadow-none"
                                >
                                  {selectedPerson ? (
                                    <div className="flex items-center gap-2 truncate w-full">
                                      {/* <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={selectedPerson.profile_pic || ''} className="object-cover" />
                                        <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                                          {((selectedPerson.first_name?.[0] || '') + (selectedPerson.last_name?.[0] || '')).toUpperCase() || '?'}
                                        </AvatarFallback>
                                      </Avatar> */}
                                      <div className="flex flex-col items-start leading-tight min-w-0">
                                        <span className="truncate text-foreground text-sm">
                                          {selectedPerson.first_name} {selectedPerson.last_name}
                                        </span>
                                        {/* {selectedPerson.email && (
                                          <span className="text-[11px] text-muted-foreground truncate w-full">
                                            {selectedPerson.email}
                                          </span>
                                        )} */}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">Select Reporting Person</span>
                                  )}
                                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[340px] p-0 z-[9999]" align="start" sideOffset={6}>
                                <Command shouldFilter={true}>
                                  <CommandInput placeholder="Search by name" className="h-10 border-none focus:ring-0" />
                                  <CommandList className="max-h-[220px] overflow-y-auto p-1">
                                    <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No resources found</CommandEmpty>
                                    <CommandGroup>
                                      {resources
                                        .filter(r => r.active_status && r.id !== resourceId)
                                        .map((r) => {
                                          const isSelected = field.value === r.id;
                                          return (
                                            <CommandItem
                                              key={r.id}
                                              value={`${r.first_name} ${r.last_name}`}
                                              onSelect={() => {
                                                field.onChange(isSelected ? null : r.id);
                                                setReportingPopoverOpen(false);
                                              }}
                                              className="flex items-center gap-2.5 py-2 px-3 cursor-pointer mb-0.5 rounded-sm"
                                            >
                                              <Avatar className="h-7 w-7 flex-shrink-0 bg-primary/10">
                                                <AvatarImage src={r.profile_pic || ''} className="object-cover" />
                                                <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                                                  {((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || '?'}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <p className="text-sm font-medium text-foreground truncate leading-tight">
                                                  {r.first_name} {r.last_name}
                                                </p>
                                                {r.email && (
                                                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                                    {r.email}
                                                  </p>
                                                )}
                                              </div>
                                              {isSelected && (
                                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                              )}
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }} />

                      <FormField control={form.control} name="working_hours" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours Per Day <span className="text-red-500">*</span></FormLabel>
                          <FormControl><Input type="number" placeholder="e.g. 8" className="shadow-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Downstream Cascading Rules Alert UI */}
                      {type === 'edit' && initialReportingPersonId && watchedReportingPersonId && Number(watchedReportingPersonId) !== Number(initialReportingPersonId) && (
                        <div className="col-span-2 flex items-start gap-3 p-4 bg-blue-50/60 border border-blue-100 rounded-xl animate-in fade-in duration-200">
                          <input
                            type="checkbox"
                            id="update_all_under_old_reporting_person"
                            className="mt-1 h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary accent-primary cursor-pointer"
                            checked={form.watch('update_all_under_old_reporting_person') || false}
                            onChange={(e) => form.setValue('update_all_under_old_reporting_person', e.target.checked)}
                          />
                          <div className="grid gap-1 select-none">
                            <label htmlFor="update_all_under_old_reporting_person" className="text-sm font-semibold text-slate-950 cursor-pointer">
                              Do you want to change other resources too?
                            </label>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Checking this will search for all team members currently reporting to <strong>{initialReportingPersonName || 'the previous selector'}</strong> and globally shift them to report to your newly assigned individual.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Active Status Toggle */}
                      <FormField control={form.control} name="active_status" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 h-[72px]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-semibold">Active Status</FormLabel>
                            <p className="text-[11px] text-muted-foreground">
                              Enable or disable this resource.
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )} />

                      {/* Type field */}
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 h-[72px]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-semibold">Resource Type <span className="text-red-500">*</span></FormLabel>
                            {/* <p className="text-[11px] text-muted-foreground">
                              Select internal or external.
                            </p> */}
                          </div>
                          <FormControl>
                            <ToggleGroup
                              type="single"
                              value={field.value}
                              onValueChange={(val) => { if (val) field.onChange(val) }}
                              className="bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg justify-start border"
                            >
                              <ToggleGroupItem
                                value="Internal"
                                className="px-3 py-1.5 h-6 text-xs rounded-md data-[state=on]:bg-primary data-[state=on]:text-white dark:data-[state=on]:text-black transition-all"
                              >
                                Internal
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="External"
                                className="px-3 py-1.5 h-6 text-xs rounded-md data-[state=on]:bg-primary data-[state=on]:text-white dark:data-[state=on]:text-black transition-all"
                              >
                                External
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-400 -mt-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <div className="flex justify-between items-center">
                        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-0.5 border">
                          <TabsTrigger value="skills" className="px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                            <Shapes className="w-4 h-4 mr-1.5" /> Skills
                          </TabsTrigger>
                          <TabsTrigger value="calendar" className="px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                            <CalendarIcon className="w-4 h-4 mr-1.5" /> Calendar
                          </TabsTrigger>
                          <TabsTrigger value="cost" className="px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                            <DollarSign className="w-4 h-4 mr-1.5" /> Cost
                          </TabsTrigger>
                        </TabsList>

                        {activeTab === "skills" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="transition-all shadow-none h-8 px-3"
                            onClick={() => prepend({ skillCategoryId: 0, skillId: 0, skillLevelId: 0 })}
                          >
                            <Plus className="w-4 h-4 mr-1.5" />Add Skill
                          </Button>
                        )}
                      </div>

                      <TabsContent value="skills" className="mt-2 space-y-2">
                        <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800">
                                <TableHead className="uppercase text-xs tracking-wider text-slate-500 dark:text-slate-400 w-[35%] h-auto py-3">Skill Category</TableHead>
                                <TableHead className="uppercase text-xs tracking-wider text-slate-500 dark:text-slate-400 w-[35%] h-auto py-3">Specific Skill</TableHead>
                                <TableHead className="uppercase text-xs tracking-wider text-slate-500 dark:text-slate-400 w-[20%] h-auto py-3">Proficiency</TableHead>
                                <TableHead className="uppercase text-xs tracking-wider text-slate-500 dark:text-slate-400 w-[10%] h-auto py-3 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fields.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="h-32 text-center">
                                    <div className="mx-auto w-12 h-12 flex items-center justify-center">
                                      <Shapes className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">No skills assigned yet.</p>
                                  </TableCell>
                                </TableRow>
                              ) : (() => {
                                const totalPages = Math.max(1, Math.ceil(fields.length / 4));
                                const currentPage = Math.min(skillPage, totalPages);
                                const startIndex = (currentPage - 1) * 4;
                                const paginatedFields = fields.slice(startIndex, startIndex + 4);

                                return paginatedFields.map((field, pageIndex) => {
                                  const index = startIndex + pageIndex;
                                  const categoryId = watchedSkills?.[index]?.skillCategoryId;
                                  return (
                                    <TableRow key={field.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/20 group">
                                      <TableCell className="align-top py-3">
                                        <FormField control={form.control} name={`skills.${index}.skillCategoryId`} render={({ field }) => (
                                          <FormItem className="space-y-0">
                                            <SearchableSelect
                                              options={skillCategories.map(c => ({ id: c.id, name: c.name }))}
                                              value={field.value}
                                              onChange={(catId) => {
                                                field.onChange(catId);
                                                form.setValue(`skills.${index}.skillId`, 0);
                                                form.setValue(`skills.${index}.skillLevelId`, 0);
                                                triggerCategoryLoad(catId);
                                              }}
                                              placeholder="Category"
                                              searchPlaceholder="Search category..."
                                              emptyText="No category found"
                                            />
                                          </FormItem>
                                        )} />
                                      </TableCell>
                                      <TableCell className="align-top py-3">
                                        <FormField control={form.control} name={`skills.${index}.skillId`} render={({ field }) => {
                                          const currentSkills = typeof categoryId === 'number' ? (skillsByCategory[categoryId] || []) : [];
                                          return (
                                            <FormItem className="space-y-0">
                                              <SearchableSelect
                                                disabled={!categoryId}
                                                options={currentSkills.map((s: any) => ({ id: s.id, name: s.name }))}
                                                value={field.value}
                                                onChange={(skillId) => {
                                                  const currentSkillsVal = form.getValues('skills') || [];
                                                  const isDuplicate = currentSkillsVal.some((s, idx) =>
                                                    idx !== index &&
                                                    s.skillCategoryId === categoryId &&
                                                    s.skillId === skillId
                                                  );
                                                  if (isDuplicate) {
                                                    const categoryName = skillCategories.find(c => c.id === categoryId)?.name || "this category";
                                                    const skillName = currentSkills.find((s: any) => s.id === skillId)?.name || "this skill";
                                                    toast.error(`Duplicate skill: "${skillName}" in category "${categoryName}" has already been added`);
                                                    field.onChange(0);
                                                  } else {
                                                    field.onChange(skillId);
                                                  }
                                                }}
                                                placeholder="Skill"
                                                searchPlaceholder="Search skill..."
                                                emptyText="No skill found"
                                              />
                                            </FormItem>
                                          );
                                        }} />
                                      </TableCell>
                                      <TableCell className="align-top py-3">
                                        <FormField control={form.control} name={`skills.${index}.skillLevelId`} render={({ field }) => (
                                          <FormItem className="space-y-0">
                                            <Select disabled={!categoryId} value={field.value ? field.value.toString() : ''} onValueChange={(v) => field.onChange(Number(v))}>
                                              <FormControl><SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent shadow-none focus:ring-1"><SelectValue placeholder="Level" /></SelectTrigger></FormControl>
                                              <SelectContent>{(typeof categoryId === 'number' ? skillLevelsByCategory[categoryId] : [])?.map((l: any) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </FormItem>
                                        )} />
                                      </TableCell>
                                      <TableCell className="align-top py-3 text-right">
                                        <Button type="button" variant="ghost" size="icon" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors" onClick={() => remove(index)}>
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              })()}
                            </TableBody>
                          </Table>
                          {fields.length > 4 && (
                            <div className="flex items-center justify-between px-4 py-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                              <div className="text-xs text-muted-foreground">
                                Showing {((Math.min(skillPage, Math.max(1, Math.ceil(fields.length / 4))) - 1) * 4) + 1} - {Math.min(Math.min(skillPage, Math.max(1, Math.ceil(fields.length / 4))) * 4, fields.length)} of {fields.length} skills
                              </div>
                              <div className="flex items-center gap-4">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-1 shadow-none"
                                  disabled={skillPage <= 1}
                                  onClick={() => setSkillPage(p => Math.max(1, p - 1))}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs p-0 shadow-none"
                                  disabled={skillPage * 4 >= fields.length}
                                  onClick={() => setSkillPage(p => p + 1)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="calendar" className="mt-0 space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-sm text-slate-500 px-1 py-2">Resource Schedule & Availability</p>
                          </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden flex flex-col">
                          {watchedCalendarId ? (
                            <div className="flex flex-row overflow-hidden">
                              <div className="w-1/3 bg-slate-50/80 dark:bg-slate-800/40 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center gap-6">
                                <div className="text-center">
                                  <span className="text-sm font-medium text-primary px-4">
                                    {formatDate(currentMonth, "MMMM yyyy")}
                                  </span>
                                </div>
                                <div className="space-y-6">
                                  <div className="text-center">
                                    <p className="font-semibold text-3xl text-foreground">
                                      {monthStats.workingDays}
                                    </p>
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mt-1">
                                      Working
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-semibold text-3xl text-foreground">
                                      {monthStats.holidays}
                                    </p>
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mt-1">
                                      Holidays
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-semibold text-3xl text-foreground">
                                      {monthStats.weekends}
                                    </p>
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mt-1">
                                      Weekends
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="w-2/3 flex items-center justify-center p-6 bg-white dark:bg-slate-950/40">
                                <Calendar
                                  mode="single"
                                  onMonthChange={setCurrentMonth}
                                  showOutsideDays={false}
                                  modifiers={{
                                    working: workingDates,
                                    holiday: filteredHolidayDates,
                                    weekend: filteredWeekendDates,
                                  }}
                                  modifiersClassNames={{
                                    working:
                                      "bg-emerald-100 text-emerald-900 font-medium dark:bg-emerald-900/40 dark:text-emerald-300 rounded-md",
                                    holiday:
                                      "bg-rose-100 text-rose-900 font-medium dark:bg-rose-900/40 dark:text-rose-300 rounded-md",
                                    weekend:
                                      "bg-orange-100 text-orange-900 font-medium dark:bg-orange-900/40 dark:text-orange-300 rounded-md",
                                  }}
                                  className="pointer-events-auto p-0 bg-transparent"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-12 text-center h-full flex flex-col justify-center items-center bg-slate-50/50 dark:bg-slate-900/20">
                              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                              <p className="text-sm text-slate-500">Please select a Calendar in the General Information step.</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="cost" className="mt-0 space-y-2">
                        <div>
                          <p className="text-sm text-slate-500 px-1 py-2">Configure resource's billing cost (optional)</p>
                        </div>

                        <div className="mb-12 flex flex-col gap-5 p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/20">
                          <FormField control={form.control} name="resourceCost.cost" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold w-1/3">Cost Value</FormLabel>
                              <div className="flex flex-col w-2/3 space-y-1">
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="e.g. 100.00" className="shadow-none bg-white dark:bg-slate-950 w-full" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="resourceCost.currencyId" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold w-1/3">Currency</FormLabel>
                              <div className="flex flex-col w-2/3 space-y-1">
                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() ?? ''}>
                                  <FormControl>
                                    <SelectTrigger className="shadow-none bg-white dark:bg-slate-950 w-full">
                                      <SelectValue placeholder="Select Currency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {currencies.map(c => (
                                      <SelectItem key={c.id} value={c.id.toString()}>{c.code} {c.symbol ? `(${c.symbol})` : ''}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="resourceCost.rate_type" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                              <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold w-1/3">Rate Type</FormLabel>
                              <div className="flex flex-col w-2/3 space-y-1">
                                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                  <FormControl>
                                    <SelectTrigger className="shadow-none bg-white dark:bg-slate-950 w-full">
                                      <SelectValue placeholder="Select Rate" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {RATE_TYPES.map(rt => (
                                      <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex justify-between w-full items-center px-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="font-medium"
                    onClick={() => step === 1 ? onOpenChange(false) : setStep(1)}
                  >
                    {step === 1 ? 'Cancel' : <><ArrowLeft className="h-4 w-4" /> Back to Profile</>}
                  </Button>

                  <div className="flex gap-3">
                    {step === 1 ? (
                      <>
                        {canEditResource && (
                          <Button type="submit" className="shadow-lg shadow-primary/20 px-6 font-semibold" disabled={loadingStates.submitting}>
                            {loadingStates.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Profile
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="font-semibold px-5"
                          onClick={async (e) => {
                            e.preventDefault();
                            const isValid = await form.trigger(['first_name', 'last_name', 'email', 'division', 'calendar', 'mobile']);
                            if (isValid) setStep(2);
                          }}
                        >
                          Skills, Calendar & Cost <ArrowRight className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {canEditResource && (
                          <Button type="submit" className="shadow-lg shadow-primary/20 px-8 font-semibold" disabled={loadingStates.submitting}>
                            {loadingStates.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {type === 'create' ? 'Complete & Create' : 'Update Changes'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}