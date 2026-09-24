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
import { createSkill, updateSkill } from "@/services/resource-management/skill-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { BookOpen, Loader2, X } from "lucide-react";
import { Skill } from "@/interfaces/skill";

interface SkillFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill?: Skill;
  type: "create" | "update";
  onSkillUpdate?: () => void;
  categoryId?: number;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Skill name is required." }),
  active_status: z.boolean().optional(),
});

export function SkillCreateDrawer({
  open,
  onOpenChange,
  skill,
  onSkillUpdate,
  type,
  categoryId,
}: SkillFormDrawerProps) {
  const createAccess = usePrivilegeGuard("18") as boolean;
  const updateAccess = usePrivilegeGuard("19") as boolean;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type === "update" ? skill?.name || "" : "",
      active_status: type === "update" ? skill?.isActive ?? true : true,
    },
  });

  const onSubmit = async (data: any) => {
    const payload = { ...data, categoryId };
    setIsSubmitting(true);
    try {
      const response =
        type === "update"
          ? await updateSkill(skill!.id, payload)
          : await createSkill(payload);

      if (response.status === 201 || response.status === 200) {
        toast.success(type === "update" ? "Skill updated." : "Skill created.");
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
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 sticky top-0 z-10 bg-background flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-lg">
                {type === "create" ? "Create Skill" : "Edit Skill"}
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
            <div className="flex-1 overflow-y-auto px-6 space-y-5">
              {!(createAccess || updateAccess) ? (
                <p className="text-sm text-muted-foreground">
                  You are not authorized to {type === "create" ? "create" : "edit"} skills.
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
                          <Input placeholder="e.g. React.js" {...field} />
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
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {type === "create" ? "Create" : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default SkillCreateDrawer;
