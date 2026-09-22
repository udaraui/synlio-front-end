"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Building2,
  Camera,
  Check,
  ChevronsUpDown,
  Loader2,
  Save,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createCompany } from "@/services/company-services";
import { load } from "@/services/user-service";
import { ActiveStatus } from "@/interfaces/common/status.enum";

interface CompanyCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  onCompanyUpdate?: () => void;
}

const formSchema = z.object({
  company: z.string().min(1, { message: "Company name is required." }),
  company_code: z.string().min(1, { message: "Company code is required." }),
  logo: z.instanceof(File).optional(),
  active_status: z.nativeEnum(ActiveStatus).optional(),
  users: z.array(z.number()).optional().default([]),
});

export function CompanyCreateDrawer({
  open,
  onOpenChange,
  onSubmit: onSubmitCallback,
  onCompanyUpdate,
}: CompanyCreateDrawerProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo: undefined,
      company: "",
      company_code: "",
      active_status: ActiveStatus.ACTIVE,
      users: [] as number[],
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const filters = [
          ...(searchUsers
            ? [{ field: "first_name", value: searchUsers, matchMode: "contains" }]
            : []),
          { field: "isActive", value: true, matchMode: "equals" },
        ];
        const params = { first: 0, rows: 100, filters };
        const result = await load(params);
        if (result && Array.isArray(result.data)) {
          const uniqueUsers = result.data.filter(
            (u, idx, self) => idx === self.findIndex((x) => x.id === u.id),
          );
          setUsers(uniqueUsers);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    if (usersOpen) fetchUsers();
  }, [usersOpen, searchUsers]);

  useEffect(() => {
    if (!open) {
      form.reset({
        logo: undefined,
        company: "",
        company_code: "",
        active_status: ActiveStatus.ACTIVE,
        users: [],
      });
      setSearchUsers("");
    }
  }, [open, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await createCompany({
        company: data.company,
        company_code: data.company_code,
        logo: data.logo,
        users: data.users,
      });
      if (response.status === 201) {
        toast.success("Company created");
        onOpenChange(false);
        form.reset();
        onCompanyUpdate?.();
        onSubmitCallback?.(response.data);
      } else {
        toast.error("Company creation failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to create company (" + (error?.message ?? "Unknown error") + ")");
    } finally {
      setIsSubmitting(false);
    }
  };

  const logoFile = form.watch("logo");
  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 sticky top-0 z-10 bg-background">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-lg">Create New Company</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Logo with camera button */}
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-2 cursor-pointer">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-2 border-background ring-1 ring-border">
                          <AvatarImage
                            src={logoPreview || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-lg font-semibold bg-primary text-white">
                            <Building2 className="w-10 h-10" />
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => document.getElementById("company-logo-create")?.click()}
                          className="absolute bottom-0 right-0 p-1.5 ring-1 bg-primary cursor-pointer text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <Input
                        type="file"
                        id="company-logo-create"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onChange(file);
                          }
                        }}
                        {...rest}
                      />
                    </div>
                  )}
                />

                <div className="flex-1 space-y-5 w-full">
                  {/* Name + Code */}
                  <div className="grid grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Acme Corporation" className="bg-muted/40" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. ACME" className="bg-muted/40" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Admin users + Status */}
                  <div className="grid grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="users"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Users</FormLabel>
                          <FormControl>
                            <Popover open={usersOpen} onOpenChange={setUsersOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between bg-muted/40 font-normal"
                                >
                                  {field.value?.length
                                    ? `${field.value.length} user(s) selected`
                                    : "Select admin users"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Search users..."
                                    value={searchUsers}
                                    onValueChange={setSearchUsers}
                                  />
                                  <CommandList className="max-h-[250px] overflow-y-auto">
                                    <CommandEmpty>
                                      {isLoadingUsers ? "Loading…" : "No users found."}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {users.map((u: any) => {
                                        const selected = field.value?.includes(u.id);
                                        return (
                                          <CommandItem
                                            key={u.id}
                                            value={u.id.toString()}
                                            onSelect={() => {
                                              const current = field.value || [];
                                              field.onChange(
                                                selected
                                                  ? current.filter((id: number) => id !== u.id)
                                                  : [...current, u.id],
                                              );
                                            }}
                                            className="flex items-start py-2"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 shrink-0 mt-0.5 ${selected ? "opacity-100" : "opacity-0"}`}
                                            />
                                            <div className="flex flex-col">
                                              <span className="text-sm">{u.first_name} {u.last_name}</span>
                                              {u.email && (
                                                <span className="text-xs text-muted-foreground">
                                                  {u.email}
                                                </span>
                                              )}
                                            </div>
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

                    <FormField
                      control={form.control}
                      name="active_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/40">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={ActiveStatus.ACTIVE}>Active</SelectItem>
                              <SelectItem value={ActiveStatus.SUSPEND}>Suspend</SelectItem>
                              <SelectItem value={ActiveStatus.BLOCK}>Block</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="px-5 pb-5 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CompanyCreateDrawer;
