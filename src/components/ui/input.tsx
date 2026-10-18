import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-base shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      inputSize: {
        default: "h-9 py-1",
        sm: "h-8 py-1",
        lg: "h-10 py-2",
      },
    },
    defaultVariants: {
      inputSize: "default",
    },
  }
)

interface InputProps extends React.ComponentProps<"input">, VariantProps<typeof inputVariants> { }

function Input({
  className,
  type,
  inputSize,
  ...props
}: InputProps) {
  const isToolbar = typeof className === "string" && className.includes("h-7");
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants({ inputSize }),
        isToolbar && "focus-visible:border-primary focus:border-primary focus-visible:ring-0 focus:ring-0 focus-visible:ring-transparent focus-visible:outline-none focus:outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Input, inputVariants }
