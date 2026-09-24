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
import { createSkillLevel, updateSkillLevel } from "@/services/resource-management/skill-services";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Loader2, Star, X } from "lucide-react";
import { Skill_level } from "@/interfaces/skill";

interface SkillLevelFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillLevel?: Skill_level;
  type: "create" | "update";
  categoryId: number;
  onSkillUpdate?: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  star_count: z.number().min(1, { message: "Star count is required." }).max(10),
  isActive: z.boolean().optional(),
});

export function SkillLevelFormDrawer({
  open,
  onOpenChange,
  skillLevel,
  categoryId,
  onSkillUpdate,
  type,
}: SkillLevelFormDrawerProps) {
  const createAccess = usePrivilegeGuard("18") as boolean;
  const updateAccess = usePrivilegeGuard("19") as boolean;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type === "update" ? skillLevel?.name || "" : "",
      star_count: type === "update" ? skillLevel?.star_count || 1 : 1,
      isActive: type === "update" ? skillLevel?.isActive ?? true : true,
    },
  });

  const onSubmit = async (data: any) => {
    const payload = { ...data, categoryId };
    setIsSubmitting(true);
    try {
      const response =
        type === "update"
          ? await updateSkillLevel(skillLevel!.id, payload)
          : await createSkillLevel(payload);

      if (response.status === 201 || response.status === 200) {
        toast.success(type === "update" ? "Skill level updated." : "Skill level created.");
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
                {type === "create" ? "Create Skill Level" : "Edit Skill Level"}
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
                  You are not authorized to {type === "create" ? "create" : "edit"} skill levels.
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
                          <Input placeholder="e.g. Beginner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="star_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Star Rating <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => field.onChange(i + 1)}
                                  className="focus:outline-none"
                                >
                                  <Star
                                    className={`h-6 w-6 transition-colors ${i < field.value
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300 dark:text-gray-600 hover:text-yellow-300"
                                      }`}
                                  />
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {field.value} / 5
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
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

export default SkillLevelFormDrawer;
