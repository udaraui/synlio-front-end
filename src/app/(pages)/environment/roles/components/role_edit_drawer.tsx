"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateRole } from "@/services/user-management/role-services";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Shield, Loader2, CheckCircle2, Building2, Save } from "lucide-react";

interface RoleEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: () => void;
  role?: any;
  onRoleUpdate?: () => void;
  isSystemUser?: boolean;
  companies?: any[];
  defaultCompanyId?: string;
}

const formSchema = z.object({
  role: z.string().min(1, { message: "Role name is required." }),

  isActive: z.boolean(),
  companyId: z.string().optional(),
});

export function RoleEditDrawer({
  open,
  onOpenChange,
  onSubmit: onSubmitCallback,
  role,
  onRoleUpdate,
  isSystemUser,
  defaultCompanyId,
}: RoleEditDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: role?.role || "",
      isActive: role?.isActive ?? true,
      companyId: role?.companyId?.toString() || defaultCompanyId || "",
    },
  });

  // Reset form when role changes
  useEffect(() => {
    if (role) {
      form.reset({
        role: role.role,
        isActive: role.isActive,
        companyId: role.companyId?.toString() || defaultCompanyId || "",
      });
    }
  }, [role, defaultCompanyId]);

  // Fetch companies for system users
  useEffect(() => {
    if (isSystemUser && open) {
      const fetchCompanies = async () => {
        try {
          const { getAllCompany } = await import("@/services/company-management/company-services");
          const result = await getAllCompany();
          setAllCompanies(result.data || []);
        } catch (error) {
          console.error("Failed to fetch companies:", error);
        }
      };
      fetchCompanies();
    }
  }, [isSystemUser, open]);

  const onSubmit = async (data: any) => {
    let targetCompanyId: number;
    const activeCompany = JSON.parse(localStorage.getItem("active_company") || "{}");

    if (isSystemUser) {
      if (!data.companyId) {
        toast.error("Please select a company");
        return;
      }
      targetCompanyId = parseInt(data.companyId);
    } else {
      targetCompanyId = role?.companyId || activeCompany?.companyId;
    }

    try {
      setIsSubmitting(true);
      const response = await updateRole(role.id, { ...data, companyId: targetCompanyId });
      if (response.status === 200 || response.status === 201) {
        toast.success("Role updated");
        onOpenChange(false);
        onRoleUpdate?.();
        onSubmitCallback?.();
      } else {
        toast.error("Role update failed");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Error updating role";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 flex-shrink-0">
          {/* <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div> */}
          <div>
            <DialogTitle className="text-lg">Edit {role?.role} Role</DialogTitle>
            {/* <DialogDescription className="text-xs mt-0.5">
              Update the details for <span className="font-medium">{role?.role}</span>.
            </DialogDescription> */}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Company */}
              {isSystemUser ? (
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allCompanies.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  {/* <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" /> */}
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Active Company
                    </p>
                    <p className="text-sm font-medium truncate">
                      {role?.company?.company ||
                        JSON.parse(localStorage.getItem("active_company") || "{}")
                          ?.companyName ||
                        "Current Company"}
                    </p>
                  </div>
                </div>
              )}

              {/* Role name */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active status */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Active Status
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {field.value ? "Role is currently active" : "Role is currently inactive"}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 pb-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-border/60"
          >
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoleEditDrawer;
