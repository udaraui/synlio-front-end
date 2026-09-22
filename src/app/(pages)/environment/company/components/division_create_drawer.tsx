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
import { createDivision } from "@/services/division-services";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Save, Layers, Loader2, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DivisionCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  companyId: number;
}

const formSchema = z.object({
  division: z.string().min(1, { message: "Division name is required." }),
  division_code: z.string().min(1, { message: "Division code is required." }),
  active_status: z.boolean().optional(),
});

export function DivisionCreateDrawer({
  open,
  onOpenChange,
  companyId,
  onSubmit: onSubmitCallback,
}: DivisionCreateDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      division: "",
      division_code: "",
      active_status: true,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ division: "", division_code: "", active_status: true });
    }
  }, [open, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await createDivision({ ...data, companyId });
      if (response.status === 201) {
        toast.success("Division created");
        onOpenChange(false);
        form.reset();
        onSubmitCallback?.(response.data);
      } else {
        toast.error("Division creation failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to create division (" + (error?.message ?? "Unknown error") + ")");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-4 bg-white dark:bg-background border shadow-xl rounded-xl gap-6">
        <DialogHeader className="p-0">
          <DialogTitle className="text-lg">Create New Division</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="division"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Engineering" className="bg-white dark:bg-background h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="division_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ENG" className="bg-white dark:bg-background h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active_status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white dark:bg-background p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold text-foreground">Active Status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Enable this division immediately after creation
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
            </div>

            <DialogFooter className="p-0 sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-white dark:bg-background h-10"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/80 text-white dark:text-black shadow-sm h-10 gap-1.5 px-5">
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

export default DivisionCreateDrawer;
