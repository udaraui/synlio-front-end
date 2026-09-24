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
import { useState, useEffect } from "react";
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
  Building2,
  Camera,
  Loader2,
  Save,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateCompany } from "@/services/company-management/company-services";
import { Company } from "@/interfaces/company";
import { API_URL } from "@/lib/constants";
import { ActiveStatus } from "@/interfaces/common/status.enum";

interface CompanyEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  company?: Company;
  onCompanyUpdate?: () => void;
}

const formSchema = z.object({
  company: z.string().min(1, { message: "Company name is required." }),
  company_code: z.string().min(1, { message: "Company code is required." }),
  logo: z.instanceof(File).optional(),
  active_status: z.nativeEnum(ActiveStatus).optional(),
});

export function CompanyEditDrawer({
  open,
  onOpenChange,
  company,
  onCompanyUpdate,
  onSubmit: onSubmitCallback,
}: CompanyEditDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo: undefined as File | undefined,
      company: company?.company,
      company_code: company?.company_code,
      active_status: (company?.isActive as ActiveStatus) || company?.active_status,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        logo: undefined,
        company: company?.company,
        company_code: company?.company_code,
        active_status: (company?.isActive as ActiveStatus) || company?.active_status,
      });
    }
  }, [open, company, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        id: company?.id,
        ...data,
        isActive: data.active_status
      };
      const response = await updateCompany(payload);
      if (response.status === 200) {
        toast.success("Company updated");
        onOpenChange(false);
        form.reset();
        onCompanyUpdate?.();
        onSubmitCallback?.(response.data);
      } else {
        toast.error("Company update failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update company (" + (error?.message ?? "Unknown error") + ")");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 sticky top-0 z-10 bg-background">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-lg">Edit Company</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Logo with camera button */}
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field: { onChange, value, ...rest } }) => {
                    const isFileObject = value instanceof File;
                    const existingImageUrl =
                      company?.logo && !isFileObject
                        ? `${API_URL}/uploads/logos/${company.logo}`
                        : null;
                    const newFileUrl =
                      isFileObject && value ? URL.createObjectURL(value as File) : null;
                    const previewUrl = newFileUrl || existingImageUrl;
                    return (
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-2 cursor-pointer">
                        <div className="relative">
                          <Avatar className="h-24 w-24 border-2 border-background ring-1 ring-border">
                            <AvatarImage
                              src={previewUrl || undefined}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-lg font-semibold bg-primary text-white">
                              <Building2 className="w-10 h-10" />
                            </AvatarFallback>
                          </Avatar>
                          <button
                            type="button"
                            onClick={() => document.getElementById("company-logo-edit")?.click()}
                            className="absolute bottom-0 right-0 p-1.5 ring-1 cursor-pointer bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                        <Input
                          type="file"
                          id="company-logo-edit"
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
                    );
                  }}
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
                            <Input placeholder="e.g. ACME" className="bg-muted/40" disabled {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status */}
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

            {/* Footer */}
            <DialogFooter className="px-8 pb-6 pt-4">
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
                Update
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CompanyEditDrawer;
