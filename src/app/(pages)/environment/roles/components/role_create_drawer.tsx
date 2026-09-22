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
import { createRole } from "@/services/role-services";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Shield, Loader2, CheckCircle2, Save } from "lucide-react";

interface RoleCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: () => void;
  onRoleUpdate?: () => void;
  isSystemUser?: boolean;
  companies?: any[];
  defaultCompanyId?: string;
}

const formSchema = z.object({
  role: z.string().min(1, { message: "Role name is required." }),

  active_status: z.boolean(),
  companyId: z.string().optional(),
});

export function RoleCreateDrawer({
  open,
  onOpenChange,
  onSubmit: onSubmitCallback,
  onRoleUpdate,
  isSystemUser,
  companies = [],
  defaultCompanyId,
}: RoleCreateDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "",
      active_status: true,
      companyId: defaultCompanyId || "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ role: "", active_status: true, companyId: defaultCompanyId || "" });
    }
  }, [open]);

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
      if (!activeCompany?.companyId) {
        toast.error("No active company found");
        return;
      }
      targetCompanyId = activeCompany.companyId;
    }

    try {
      setIsSubmitting(true);
      const response = await createRole({ ...data, companyId: targetCompanyId });
      if (response.status === 201) {
        toast.success("Role created");
        onOpenChange(false);
        onRoleUpdate?.();
        onSubmitCallback?.();
      } else {
        toast.error("Role creation failed");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Error creating role";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 flex-shrink-0">
          {/* <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div> */}
          <div>
            <DialogTitle className="text-lg">Create New Role</DialogTitle>
            {/* <DialogDescription className="text-xs mt-0.5">
              Fill in the information below to create a new role.
            </DialogDescription> */}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Company selector (system users only) */}
              {isSystemUser && (
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
                          {companies.map((c) => (
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
              )}

              {/* Role name */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Project Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active status */}
              <FormField
                control={form.control}
                name="active_status"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Active Status
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enable this role immediately after creation
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
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoleCreateDrawer;
