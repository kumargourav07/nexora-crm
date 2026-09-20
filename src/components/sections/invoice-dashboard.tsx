"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  FileCheck,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/animations/gsap";

const REVENUE_CARDS = [
  {
    title: "Total Invoiced",
    value: "₹8.4M",
    badge: "100%",
    icon: Receipt,
    color: "text-primary",
  },
  {
    title: "Collected / Paid",
    value: "₹6.7M",
    badge: "80%",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  {
    title: "Pending Clearance",
    value: "₹1.2M",
    badge: "14%",
    icon: Clock,
    color: "text-amber-400",
  },
  {
    title: "Overdue Follow-up",
    value: "₹0.5M",
    badge: "6%",
    icon: AlertCircle,
    color: "text-rose-400",
  },
];

export function InvoiceDashboard() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const paidBadgeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        defaults: { ease: "power3.out" },
      });

      // 1. Revenue cards entrance
      tl.fromTo(
        ".invoice-revenue-card",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }
      );

      // 2. Invoice Document Sheet reveal
      tl.fromTo(
        ".invoice-sheet-container",
        { opacity: 0, scale: 0.96, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7 },
        "-=0.3"
      );

      // 3. Paid stamp reveal
      if (paidBadgeRef.current) {
        tl.fromTo(
          paidBadgeRef.current,
          { scale: 0, opacity: 0, rotation: -12 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: "back.out(1.7)" },
          "-=0.2"
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* 4 Revenue Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {REVENUE_CARDS.map((card) => (
          <div
            key={card.title}
            className="invoice-revenue-card rounded-xl border border-border/70 bg-surface/80 p-3 space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 truncate">
                <card.icon className={cn("h-3.5 w-3.5", card.color)} />
                {card.title}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                {card.badge}
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Realistic Invoice Document Sheet */}
      <div className="invoice-sheet-container rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/30 space-y-5">
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold font-mono text-sm">
              ◈
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-foreground">
                NEXORA TECHNOLOGIES
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                Invoice #INV-1048 • GST Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stamp Badge */}
            <div
              ref={paidBadgeRef}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm shadow-emerald-500/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              PAID IN FULL
            </div>
          </div>
        </div>

        {/* Bill To & Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">
              Billed To
            </span>
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-primary" />
              Acme Realty Private Limited
            </p>
            <p className="text-[11px] text-muted-foreground">
              GSTIN: 27AADCB2230M1Z2 • Maharashtra, IN
            </p>
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">
              Dates &amp; Currency
            </span>
            <p className="text-foreground">
              Issued: <span className="font-mono">Apr 12, 2026</span> • Due: <span className="font-mono">Apr 26, 2026</span>
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold">
              Payment Method: HDFC Direct Bank Transfer
            </p>
          </div>
        </div>

        {/* Invoice Line Items Table */}
        <div className="rounded-xl border border-border/60 bg-card/70 overflow-hidden text-xs">
          <div className="grid grid-cols-12 bg-surface-elevated/70 px-3 py-2 text-[10px] font-mono uppercase text-muted-foreground border-b border-border/50">
            <span className="col-span-7">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-3 text-right">Amount (INR)</span>
          </div>

          <div className="divide-y divide-border/40">
            <div className="grid grid-cols-12 px-3 py-2.5 items-center">
              <div className="col-span-7 space-y-0.5">
                <p className="font-semibold text-foreground">CRM Enterprise Platform</p>
                <p className="text-[10px] text-muted-foreground">10 Users • Annual Billing Sync</p>
              </div>
              <span className="col-span-2 text-center font-mono text-muted-foreground">1</span>
              <span className="col-span-3 text-right font-mono font-semibold text-foreground">
                ₹24,000.00
              </span>
            </div>

            <div className="grid grid-cols-12 px-3 py-2.5 items-center">
              <div className="col-span-7 space-y-0.5">
                <p className="font-semibold text-foreground">Setup &amp; Automated Pipeline Onboarding</p>
                <p className="text-[10px] text-muted-foreground">Custom WhatsApp &amp; Meta Lead Hooks</p>
              </div>
              <span className="col-span-2 text-center font-mono text-muted-foreground">1</span>
              <span className="col-span-3 text-right font-mono font-semibold text-foreground">
                ₹8,000.00
              </span>
            </div>
          </div>

          {/* Subtotal, Tax & Total Calculation Footer */}
          <div className="border-t border-border/60 bg-surface/80 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>Subtotal</span>
              <span className="font-mono">₹32,000.00</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>GST (18% Integrated IGST)</span>
              <span className="font-mono">₹5,760.00</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/40">
              <span className="text-primary font-semibold">Total Amount</span>
              <span className="font-mono text-base font-extrabold text-primary">
                ₹37,760.00
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Proof of Transfer Bar */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <FileCheck className="h-3 w-3" />
            Reconciled with HDFC Bank (TXN-884920)
          </span>
          <span className="font-mono">Auto-generated via NEXORA Invoicing</span>
        </div>
      </div>
    </div>
  );
}
