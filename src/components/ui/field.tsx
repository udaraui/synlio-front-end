import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal"
            ? "flex-row items-center gap-2"
            : "flex-col gap-1.5",
          className
        )}
        {...props}
      />
    );
  }
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  return (
    <Label
      ref={ref}
      className={cn("text-xs text-muted-foreground whitespace-nowrap cursor-pointer", className)}
      {...props}
    />
  );
});
FieldLabel.displayName = "FieldLabel";

export { Field, FieldLabel };
