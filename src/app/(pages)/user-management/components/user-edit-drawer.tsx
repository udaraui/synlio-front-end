"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Camera,
  Check,
  ChevronsUpDown,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Building2,
  Loader2,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { User as UserType } from "@/interfaces/user";
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
import { updateUser } from "@/services/user-management/user-service";
import { Switch } from "@/components/ui/switch";
import { API_URL } from "@/lib/constants";
import { getAllCompany } from "@/services/company-management/company-services";
import { safeParse } from "@/services/auth/auth-service";

interface UserEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  user?: UserType;
  defaultCompanyId?: string;
}

const formSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }),
  last_name: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone_number: z.string().min(1, { message: "Phone number is required." }),
  profile_picture: z.union([z.instanceof(File), z.undefined()]).optional(),
  companies: z.array(z.number()).optional().default([]),
  divisions: z.array(z.number()).optional().default([]),
  userCompanyRoles: z
    .array(z.object({ companyId: z.number(), roleId: z.number() }))
    .optional()
    .default([]),
  isActive: z.boolean(),
  companyId: z.string().optional(),
});

export function UserEditDrawer({
  open,
  onOpenChange,
  onSubmit: onSubmitCallback,
  user,
  defaultCompanyId,
}: UserEditDrawerProps) {
  const [roles, setRoles] = useState<any[]>([]);
  const [divisionsOpen, setDivisionsOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [isSystemUser, setIsSystemUser] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profile_picture: undefined,
      first_name: user?.first_name,
      last_name: user?.last_name,
      email: user?.email,
      phone_number: user?.mobile_number,
      isActive: Boolean(user?.isActive),
      companies: [],
      divisions: user?.divisions?.map((d) => d.id),
      userCompanyRoles: [],
      companyId: defaultCompanyId || "",
    },
  });

  useEffect(() => {
    const getInitialData = async () => {
      const localCompanies = safeParse(localStorage.getItem("companies")) || [];
      const systemMode = localCompanies.length === 0;
      setIsSystemUser(systemMode);

      if (systemMode) {
        try {
          const result = await getAllCompany();
          setAllCompanies(result.data || []);
        } catch (error) {
          console.error("Failed to fetch companies:", error);
        }
      }

      const active_company = safeParse(localStorage.getItem("active_company"));
      if (!systemMode && active_company?.companyId) {
        const response = await getAllRoleByCompany(active_company.companyId);
        if (response.status === 200) setRoles(response.data);
      }
    };
    getInitialData();
  }, [user]);

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

  useEffect(() => {
    setPreviewUrl(null);
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      const localCompanies = safeParse(localStorage.getItem("companies")) || [];
      const sysMode = localCompanies.length === 0;
      let activeCompanyId: number | null = null;
      if (sysMode) {
        activeCompanyId = defaultCompanyId ? parseInt(defaultCompanyId) : null;
      } else {
        const ac = safeParse(localStorage.getItem("active_company"));
        activeCompanyId = ac?.companyId ?? null;
      }

      const filteredRoles = activeCompanyId
        ? user.userCompanyRoles?.filter((ucr) => {
          const cid = Number(
            ucr.company?.id ??
            (ucr as any).companyId ??
            (ucr as any).company_id ??
            0
          );
          return cid === Number(activeCompanyId);
        })
        : user.userCompanyRoles;

      form.reset({
        profile_picture: undefined,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone_number: user.mobile_number || "",
        isActive: Boolean(user.isActive),
        companies: [],
        divisions: user.divisions?.map((d) => d.id) || [],
        userCompanyRoles:
          filteredRoles?.map((ucr) => ({
            companyId: ucr.company?.id ?? (ucr as any).companyId ?? (ucr as any).company_id,
            roleId: ucr.role?.id,
          })) || [],
        companyId:
          defaultCompanyId ||
          (activeCompanyId ? String(activeCompanyId) : "") ||
          user.userCompanyRoles?.[0]?.company?.id?.toString() ||
          "",
      });
    }
  }, [user, form, defaultCompanyId]);

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
    setIsSubmitting(true);
    const localCompanies = safeParse(localStorage.getItem("companies")) || [];
    const isSystem = localCompanies.length === 0;

    let targetCompanyId: number;
    if (isSystem) {
      if (!data.companyId) {
        toast.error("Please select a company");
        setIsSubmitting(false);
        return;
      }
      targetCompanyId = parseInt(data.companyId);
    } else {
      const loggedCompany = safeParse(localStorage.getItem("active_company"));
      targetCompanyId = loggedCompany.companyId;
    }

    const payload = {
      id: user?.id,
      ...data,
      companyIds: [targetCompanyId],
      divisionIds: data.divisions,
      userCompanyRoles: data.userCompanyRoles.map((ucr: any) => ({
        ...ucr,
        companyId: targetCompanyId,
      })),
    };

    if (!data.profile_picture) delete payload.profile_picture;
    delete payload.companies;
    delete payload.divisions;

    try {
      const response = await updateUser(payload);
      if (response.status === 200) {
        toast.success("User updated");
        onOpenChange(false);
        form.reset();
        onSubmitCallback?.(payload);
      } else {
        toast.error("User update failed");
      }
    } catch (error: any) {
      toast.error("Failed to update user (" + error.message + ")");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 flex-shrink-0">
          <div>
            <DialogTitle className="text-lg">Edit {user?.first_name} {user?.last_name}'s Profile</DialogTitle>
          </div>
        </div>

        {/* Scrollable body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">

              {/* Profile picture + name + contact */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar with camera button */}
                <FormField
                  control={form.control}
                  name="profile_picture"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-2 border-background ring-1 ring-border">
                          <AvatarImage
                            src={
                              previewUrl ||
                              (user?.profile_picture
                                ? `${API_URL}/uploads/${user.profile_picture}`
                                : undefined)
                            }
                            className="object-cover"
                          />
                          <AvatarFallback className="text-2xl font-semibold bg-primary text-white">
                            {user?.first_name?.charAt(0)}
                            {user?.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => document.getElementById("user-pic-edit")?.click()}
                          className="absolute cursor-pointer bottom-0.5 right-0.5 p-1.5 ring-1 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <Input
                        type="file"
                        id="user-pic-edit"
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
                <div className="flex-1 grid grid-cols-2 gap-x-5 gap-y-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. John" autoComplete="off" className="shadow-none" {...field} />
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
                          <Input placeholder="e.g. Doe" autoComplete="off" className="shadow-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="e.g. john@company.com" autoComplete="off" className="shadow-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                        <FormLabel>Company Context <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        value={
                          user?.userCompanyRoles?.find(
                            (ucr) => ucr.company?.id?.toString() === form.getValues("companyId")
                          )?.company?.company ||
                          safeParse(localStorage.getItem("active_company"))?.company ||
                          "Editing current company roles"
                        }
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
                  render={({ field }) => {
                    const selectedCount =
                      field.value?.filter((id: number) =>
                        divisions.some((d: any) => d.id === id)
                      ).length || 0;
                    return (
                      <FormItem>
                        <FormLabel>Divisions</FormLabel>
                        <FormControl>
                          <Popover open={divisionsOpen} onOpenChange={setDivisionsOpen} modal={false}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                              >
                                {selectedCount > 0
                                  ? `${selectedCount} division(s)`
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
                                          className={`mr-2 h-4 w-4 ${field.value?.includes(division.id)
                                            ? "opacity-100"
                                            : "opacity-0"
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
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="userCompanyRoles"
                  render={({ field }) => {
                    const selectedCount =
                      field.value?.filter((item: any) =>
                        roles.some((r: any) => r.id === item.roleId)
                      ).length || 0;
                    return (
                      <FormItem>
                        <FormLabel>Roles</FormLabel>
                        <FormControl>
                          <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                              >
                                {selectedCount > 0
                                  ? `${selectedCount} role(s)`
                                  : "Select roles..."}
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
                                              targetId = parseInt(
                                                form.getValues("companyId") || "0"
                                              );
                                              if (!targetId) {
                                                toast.error("Please select a company context first"
                                                );
                                                return;
                                              }
                                            } else {
                                              targetId = safeParse(
                                                localStorage.getItem("active_company")
                                              )?.companyId;
                                            }
                                            field.onChange(
                                              isSelected
                                                ? current.filter(
                                                  (item: any) => item.roleId !== role.id
                                                )
                                                : [
                                                  ...current,
                                                  { companyId: targetId, roleId: role.id },
                                                ]
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
                    );
                  }}
                />
              </div>

              {/* Status toggle */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <FormLabel className="text-sm font-medium">Account Status</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {field.value ? "User is active and can log in" : "User is disabled"}
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
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
                Update
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default UserEditDrawer;
