import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "muted" | "accent" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
}

const variantClasses = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary text-secondary-foreground border-border",
  muted: "bg-surface-elevated text-muted-foreground border-border-subtle",
  accent: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg text-sm [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 rounded-xl text-base [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-12 w-12 rounded-xl text-lg [&>svg]:h-6 [&>svg]:w-6",
  xl: "h-14 w-14 rounded-2xl text-xl [&>svg]:h-7 [&>svg]:w-7",
};

export const IconBox = React.forwardRef<HTMLDivElement, IconBoxProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center shrink-0 border select-none transition-colors",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

IconBox.displayName = "IconBox";
