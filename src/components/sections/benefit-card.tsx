"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BenefitCardProps {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  tag?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BenefitCard({
  number,
  eyebrow,
  title,
  description,
  tag,
  className,
  children,
}: BenefitCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "benefit-bento-card group flex flex-col justify-between rounded-2xl border bg-card/70 p-6 sm:p-7 shadow-lg shadow-black/10 transition-colors",
        "border-border/70 hover:border-primary/40 hover:bg-surface-elevated/80",
        className
      )}
    >
      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold tracking-widest text-primary">
            {number} / {eyebrow}
          </span>
          {tag && (
            <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground border border-border/60">
              {tag}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <h4 className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Embedded Product Micro Visual */}
      {children && <div className="mt-5 pt-4 border-t border-border/40">{children}</div>}
    </motion.div>
  );
}
