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
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateDivision } from "@/services/company-management/division-services";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Division } from "@/interfaces/division";
import { Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DivisionEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  companyId: number;
  division: Division;
}

const formSchema = z.object({
  division: z.string().min(1, { message: "Division name is required." }),
  division_code: z.string().min(1, { message: "Division code is required." }),
  isActive: z.boolean().optional(),
});

export function DivisionEditDrawer({
  open,
  onOpenChange,
  companyId,
  onSubmit: onSubmitCallback,
  division,
}: DivisionEditDrawerProps) {
  if (!division) return null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      division: "",
      division_code: "",
      isActive: false,
    },
  });

  useEffect(() => {
    if (division) {
      form.reset({
        division: division.division,
        division_code: division.division_code,
        isActive: division.isActive,
      });
    }
  }, [division, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await updateDivision(division.id, { ...data, companyId });
      if (response.status === 200) {
        toast.success("Division updated");
        onOpenChange(false);
        form.reset();
        onSubmitCallback?.(response.data);
      } else {
        toast.error("Division update failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update division (" + (error?.message ?? "Unknown error") + ")");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-4 bg-white dark:bg-background border shadow-xl rounded-xl gap-6">
        <DialogHeader className="p-0">
          <DialogTitle className="text-lg">Edit Division</DialogTitle>
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white dark:bg-background p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold text-foreground">Active Status</FormLabel>
                      {/* <p className="text-sm text-muted-foreground">
                        Division's active state
                      </p> */}
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
                Update
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default DivisionEditDrawer;
