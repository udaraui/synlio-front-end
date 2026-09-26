"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { User } from "@/interfaces/user";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAllDivisionsByCompanyId } from "@/services/company-management/division-services";
import { getAllRoleByCompany } from "@/services/user-management/role-services";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  User as UserIcon,
  Camera,
  Save,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createUser, searchUserByEmail } from "@/services/user-management/user-service";
import { safeParse } from "@/services/auth/auth-service";
import { useDebounce } from "@/hooks/use-debounce";

interface UserCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  user?: User;
  defaultCompanyId?: string;
}

const formSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }),
  last_name: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone_number: z.string().min(1, { message: "Phone number is required." }),
  password: z.string().optional(),
  profile_picture: z.instanceof(File).optional(),
  companies: z.array(z.number()).optional().default([]),
  divisions: z.array(z.number()).optional().default([]),
  userCompanyRoles: z
    .array(z.object({ companyId: z.number(), roleId: z.number() }))
    .optional()
    .default([]),
  isActive: z.boolean(),
  companyId: z.string().optional(),
});

export function UserCreateDrawer({ open, onOpenChange, onSubmit: onSubmitCallback, defaultCompanyId }: UserCreateDrawerProps) {
  const [roles, setRoles] = useState<any[]>([]);
  const [divisionsOpen, setDivisionsOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [isSystemUser, setIsSystemUser] = useState(false);
  const [existingUser, setExistingUser] = useState<any | null>(null);
  const [isAlreadyInCompany, setIsAlreadyInCompany] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profile_picture: undefined,
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      password: "",
      isActive: true,
      companies: [],
      divisions: [],
      userCompanyRoles: [],
      companyId: defaultCompanyId || "",
    },
  });

  const watchedFirstName = form.watch("first_name") || "";
  const watchedLastName = form.watch("last_name") || "";

  const getInitials = (first: string, last: string) => {
    const f = first.trim();
    const l = last.trim();
    if (!f && !l) return <UserIcon className="w-12 h-12" />;
    return `${f.charAt(0) || ""}${l.charAt(0) || ""}`.toUpperCase();
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      form.reset({ companyId: defaultCompanyId || "" });
      setExistingUser(null);
      setPreviewUrl(null);
      setIsAlreadyInCompany(false);
    }
  }, [open, form, defaultCompanyId]);

  useEffect(() => {
    const getInitialData = async () => {
      const localCompanies = safeParse(localStorage.getItem("companies")) || [];
      const systemMode = localCompanies.length === 0;
      setIsSystemUser(systemMode);

      if (systemMode) {
        try {
          const { getAllCompany } = await import("@/services/company-management/company-services");
          const result = await getAllCompany();
          setAllCompanies(result.data || []);
        } catch (error) {
          console.error("Failed to fetch companies:", error);
        }
      } else {
        const active_company = safeParse(localStorage.getItem("active_company"));
        if (active_company?.companyId) {
          const response = await getAllRoleByCompany(active_company.companyId);
          if (response.status === 200) setRoles(response.data);
        }
      }
    };
    getInitialData();
  }, []);

  const selectedCompanyId = form.watch("companyId");
  useEffect(() => {
    if (isSystemUser && selectedCompanyId) {
      const fetchRoles = async () => {
        const response = await getAllRoleByCompany(parseInt(selectedCompanyId));
        if (response.status === 200) setRoles(response.data);
      };
      const fetchDivisions = async () => {
        const response = await getAllDivisionsByCompanyId(parseInt(selectedCompanyId));
        if (response.status === 200) setDivisions(response.data);
      };
      fetchRoles();
      fetchDivisions();
    }
  }, [selectedCompanyId, isSystemUser]);

  // Check if existing user is already in the target company
  useEffect(() => {
    if (existingUser) {
      let targetCompanyId: number | null = null;
      if (isSystemUser) {
        targetCompanyId = selectedCompanyId ? parseInt(selectedCompanyId) : null;
      } else {
        const active_company = safeParse(localStorage.getItem("active_company"));
        targetCompanyId = active_company?.companyId ? parseInt(active_company.companyId) : null;
      }

      if (targetCompanyId) {
        const isMember = existingUser.companies?.some(
          (c: any) => c.id === targetCompanyId
        );
        setIsAlreadyInCompany(!!isMember);
      } else {
        setIsAlreadyInCompany(false);
      }
    } else {
      setIsAlreadyInCompany(false);
    }
  }, [existingUser, selectedCompanyId, isSystemUser]);

  // Email lookup — autofill if existing user found
  const emailValue = form.watch("email");
  const debouncedEmail = useDebounce(emailValue, 500);
  useEffect(() => {
    const searchUser = async () => {
      if (debouncedEmail && z.string().email().safeParse(debouncedEmail).success) {
        setIsSearching(true);
        try {
          const response = await searchUserByEmail(debouncedEmail);
          if (response.status === 200 && response.data) {
            setExistingUser(response.data);
            form.setValue("first_name", response.data.first_name);
            form.setValue("last_name", response.data.last_name);
            form.setValue("phone_number", response.data.mobile_number || "");
          } else {
            setExistingUser(null);
          }
        } catch {
          setExistingUser(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setExistingUser(null);
      }
    };
    searchUser();
  }, [debouncedEmail, form]);

  useEffect(() => {
    getFilteredDivisions();
  }, []);

  const getFilteredDivisions = async () => {
    if (isSystemUser) return;
    const active_company = safeParse(localStorage.getItem("active_company"));
    if (active_company?.companyId) {
      const response = await getAllDivisionsByCompanyId(active_company.companyId);
      if (response.status === 200) setDivisions(response.data);
    }
  };

  const onSubmit = async (data: any) => {
    if (existingUser && isAlreadyInCompany) {
      toast.warning("This user is already a member of this company.");
      return;
    }

    if (!existingUser && !data.password) {
      toast.error("Password is required for new users");
      return;
    }

    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    const isSystem = localCompanies.length === 0;

    let targetCompanyId: number;
    if (isSystem) {
      if (!data.companyId) {
        toast.error("Please select a company");
        return;
      }
      targetCompanyId = parseInt(data.companyId);
    } else {
      const loggedCompany = safeParse(localStorage.getItem("active_company"));
      targetCompanyId = loggedCompany.companyId;
    }

    const payload = {
      ...data,
      companyIds: [targetCompanyId],
      divisionIds: data.divisions,
      userCompanyRoles: data.userCompanyRoles.map((ucr: any) => ({
        ...ucr,
        companyId: targetCompanyId,
      })),
    };
    delete payload.companies;
    delete payload.divisions;

    setIsSubmitting(true);
    try {
      const response = await createUser(payload);
      if (response.status === 201 || response.status === 200) {
        toast.success(existingUser ? "User added to company" : "User created");
        onOpenChange(false);
        form.reset();
        setExistingUser(null);
        setIsAlreadyInCompany(false);
        onSubmitCallback?.(payload);
      } else {
        toast.error("Operation failed");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Operation failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 flex-shrink-0">
          <div>
            <DialogTitle className="text-lg px-2">
              {existingUser ? "Add Existing User" : "Create New User"}
            </DialogTitle>
          </div>
        </div>

        {/* Scrollable body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-5">

              {/* Profile picture + name + contact */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Avatar with camera button */}
                <FormField
                  control={form.control}
                  name="profile_picture"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-2 border-background ring-1 ring-border">
                          <AvatarImage
                            src={previewUrl || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-2xl font-semibold bg-primary text-white">
                            {getInitials(watchedFirstName, watchedLastName)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => document.getElementById("user-pic-create")?.click()}
                          className="absolute cursor-pointer bottom-0.5 right-0.5 p-1.5 ring-1 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <Input
                        type="file"
                        id="user-pic-create"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onChange(file);
                            setPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                        {...rest}
                      />
                      {/* <span className="text-xs text-muted-foreground">Click icon to change</span> */}
                    </div>
                  )}
                />

                {/* Name + email + phone grid */}
                <div className="flex-1 grid grid-cols-2 gap-x-5 gap-y-4 w-full">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                            {isSearching && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Looking up...
                              </span>
                            )}
                          </div>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="e.g. john@company.com" 
                              autoComplete="new-password" 
                              className="shadow-none" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value.trimStart())}
                              onBlur={(e) => field.onChange(e.target.value.trim())}
                            />
                          </FormControl>
                         {existingUser && isAlreadyInCompany && (
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              This user is already a member of this company.
                            </div>
                          )}
                          {existingUser && !isAlreadyInCompany && (
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                              <UserCheck className="h-3.5 w-3.5 shrink-0" />
                              Existing user found. Basic information filled automatically.
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. John" 
                            autoComplete="off" 
                            className="shadow-none" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.trimStart())}
                            onBlur={(e) => field.onChange(e.target.value.trim())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Doe" 
                            autoComplete="off" 
                            className="shadow-none" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.trimStart())}
                            onBlur={(e) => field.onChange(e.target.value.trim())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!existingUser && (
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Set initial password" autoComplete="new-password" className="shadow-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Full width Phone + Company row */}
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="e.g. +1 (555) 000-0000" autoComplete="off" className="shadow-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company context / Active company */}
                {isSystemUser ? (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="shadow-none">
                              <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allCompanies.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormItem>
                    <FormLabel>Active Company</FormLabel>
                    <FormControl>
                      <Input
                        disabled
                        className="shadow-none"
                        value={safeParse(localStorage.getItem("active_company"))?.company || "Current Company"}
                      />
                    </FormControl>
                  </FormItem>
                )}
              </div>

              {/* Divisions + Roles */}
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="divisions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Divisions</FormLabel>
                      <FormControl>
                        <Popover open={divisionsOpen} onOpenChange={setDivisionsOpen} modal={false}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between font-normal text-muted-foreground"
                            >
                              {field.value?.length > 0
                                ? `${field.value.length} division(s)`
                                : "Select divisions"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search divisions..." />
                              <CommandList>
                                <CommandEmpty>No divisions found.</CommandEmpty>
                                <CommandGroup>
                                  {divisions.map((division: any) => (
                                    <CommandItem
                                      key={division.id}
                                      value={division.division}
                                      onSelect={() => {
                                        const current = field.value || [];
                                        field.onChange(
                                          current.includes(division.id)
                                            ? current.filter((id: number) => id !== division.id)
                                            : [...current, division.id]
                                        );
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${field.value?.includes(division.id) ? "opacity-100" : "opacity-0"
                                          }`}
                                      />
                                      {division.division}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userCompanyRoles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <FormControl>
                        <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between font-normal text-muted-foreground"
                            >
                              {field.value?.length > 0
                                ? `${field.value.length} role(s)`
                                : "Select roles"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-full p-0 z-[9999]"
                            align="start"
                            sideOffset={6}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <Command>
                              <CommandInput placeholder="Search roles..." />
                              <CommandList>
                                <CommandEmpty>No roles found.</CommandEmpty>
                                <CommandGroup>
                                  {roles.map((role: any) => {
                                    const isSelected = field.value?.some(
                                      (item: any) => item.roleId === role.id
                                    );
                                    return (
                                      <CommandItem
                                        key={role.id}
                                        value={role.role}
                                        onSelect={() => {
                                          const current = field.value || [];
                                          const localCompanies =
                                            safeParse(localStorage.getItem("companies")) || [];
                                          const isSystem = localCompanies.length === 0;
                                          let targetId: number;
                                          if (isSystem) {
                                            targetId = parseInt(form.getValues("companyId") || "0");
                                            if (!targetId) {
                                              toast.error("Please select a company first");
                                              return;
                                            }
                                          } else {
                                            targetId = safeParse(
                                              localStorage.getItem("active_company")
                                            )?.companyId;
                                          }
                                          field.onChange(
                                            isSelected
                                              ? current.filter((item: any) => item.roleId !== role.id)
                                              : [...current, { companyId: targetId, roleId: role.id }]
                                          );
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"
                                            }`}
                                        />
                                        {role.role}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 pb-4 flex-shrink-0 mt-4">
              <Button
                type="button"
                variant="outline"
                className="border-border/60"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {existingUser ? "Add" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default UserCreateDrawer;
