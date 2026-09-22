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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
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
import { createSkillCategory, updateSkillCategory } from "@/services/skill-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Loader2, X, Save } from "lucide-react";

interface SkillCategoryFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillCategory?: any;
  type: "create" | "update";
  onSkillUpdate?: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  active_status: z.boolean().optional(),
});

export function SkillCategoryFormDrawer({
  open,
  onOpenChange,
  skillCategory,
  onSkillUpdate,
  type,
}: SkillCategoryFormDrawerProps) {
  const createAccess = usePrivilegeGuard("18") as boolean;
  const updateAccess = usePrivilegeGuard("19") as boolean;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type === "update" ? skillCategory?.name || "" : "",
      description: type === "update" ? skillCategory?.description || "" : "",
      active_status: type === "update" ? skillCategory?.isActive ?? true : true,
    },
  });

  const onSubmit = async (data: any) => {
    const active_company = JSON.parse(localStorage.getItem("active_company") || "{}");
    const payload = { ...data, companyId: active_company.companyId };
    setIsSubmitting(true);
    try {
      const response =
        type === "update"
          ? await updateSkillCategory(skillCategory?.id, payload)
          : await createSkillCategory(payload);

      if (response.status === 201 || response.status === 200) {
        toast.success(type === "update" ? "Skill category updated." : "Skill category created.");
        onOpenChange(false);
        form.reset();
        onSkillUpdate?.();
      } else {
        toast.error(type === "update" ? "Update failed." : "Creation failed.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 sticky top-0 z-10 bg-background flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-lg">
                {type === "create" ? "Create Skill Category" : "Edit Skill Category"}
              </DialogTitle>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 pb-3 space-y-5">
              {!(createAccess || updateAccess) ? (
                <p className="text-sm text-muted-foreground">
                  You are not authorized to {type === "create" ? "create" : "edit"} skill categories.
                </p>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Technical Skills" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe this skill category..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active_status"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Status</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {field.value ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4">
              <div className="flex justify-end w-full items-center gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !(createAccess || updateAccess)}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {type === "create" ? "Create" : "Update"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default SkillCategoryFormDrawer;
