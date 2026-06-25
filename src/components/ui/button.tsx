"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-signal-500 text-[#042522] hover:bg-signal-400 font-semibold shadow-sm",
        secondary: "bg-elevated text-ink border border-line-strong hover:border-ink-3",
        outline: "border border-line-strong text-ink hover:bg-elevated hover:border-ink-3",
        ghost: "text-ink-2 hover:text-ink hover:bg-elevated",
        danger: "bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
