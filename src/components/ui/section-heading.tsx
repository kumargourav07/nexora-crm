import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

export interface SectionHeadingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  align?: "left" | "center";
}

export const SectionHeading = React.forwardRef<HTMLDivElement, SectionHeadingProps>(
  ({ className, eyebrow, title, description, align = "center", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "max-w-3xl flex flex-col space-y-4",
          align === "center" ? "mx-auto text-center items-center" : "text-left items-start",
          className
        )}
        {...props}
      >
        {eyebrow && (
          <Badge variant="primary" size="md">
            {eyebrow}
          </Badge>
        )}
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
    );
  }
);

SectionHeading.displayName = "SectionHeading";
